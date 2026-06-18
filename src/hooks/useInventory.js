import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { mapInventoryFromDB } from '../utils/dbMappers';

export const useInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load inventory from Supabase on mount and when user changes
  useEffect(() => {
    if (!user) {
      setInventory([]);
      setLoading(false);
      return;
    }

    fetchInventory();
  }, [user]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('order_date', { ascending: true }); // FIFO ordering

      if (error) throw error;

      // Map database format to app format
      const mappedInventory = (data || []).map(mapInventoryFromDB);
      setInventory(mappedInventory);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Add items from invoice (increases quantity)
  const addFromInvoice = useCallback(async (items, invoiceName = 'Invoice', orderNumber = null, orderDate = null, vendor = null) => {
    if (!user) {
      throw new Error('User must be logged in to add inventory');
    }

    try {
      // Prepare inventory items for insertion
      const inventoryItems = items.map(newItem => {
        // Convert packing to X/Y format if packagesPerCase and itemsPerPackage are provided
        let packingFormat = '1/1';
        if (newItem.packagesPerCase && newItem.itemsPerPackage) {
          packingFormat = `${newItem.packagesPerCase}/${newItem.itemsPerPackage}`;
        } else if (newItem.packing && typeof newItem.packing === 'string') {
          packingFormat = newItem.packing;
        }
        
        return {
          user_id: user.id,
          order_id: newItem.orderId, // This should be set from the order creation
          part_number: newItem.partNumber,
          description: newItem.description,
          quantity: newItem.quantity,
          cost: newItem.cost,
          line_total: newItem.lineTotal,
          packing: packingFormat,
          order_number: orderNumber,
          order_date: orderDate || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          vendor: vendor || 'Unknown'
        };
      });

      const { data, error } = await supabase
        .from('inventory')
        .insert(inventoryItems)
        .select();

      if (error) throw error;

      // Map database format to app format
      const mappedData = data.map(mapInventoryFromDB);

      // Update local state
      setInventory(prev => [...prev, ...mappedData]);

      return mappedData;
    } catch (error) {
      console.error('Error adding inventory from invoice:', error);
      throw error;
    }
  }, [user]);

  // Remove items from shoot list (decreases quantity) - uses FIFO
  const subtractFromShootList = useCallback(async (items, shootListName = 'Shoot List') => {
    if (!user) {
      throw new Error('User must be logged in to subtract inventory');
    }

    const warnings = [];
    
    try {
      // Process each item
      for (const removeItem of items) {
        // Find all matching part numbers, sorted by order date (FIFO - oldest first)
        const matchingItems = inventory
          .filter(item => item.part_number?.toLowerCase() === removeItem.partNumber.toLowerCase())
          .sort((a, b) => {
            const dateA = new Date(a.order_date || 0).getTime();
            const dateB = new Date(b.order_date || 0).getTime();
            return dateA - dateB;
          });
        
        if (matchingItems.length === 0) {
          warnings.push({
            partNumber: removeItem.partNumber,
            requested: removeItem.quantity,
            available: 0,
            notFound: true
          });
          continue;
        }
        
        // Calculate total available
        const totalAvailable = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalAvailable < removeItem.quantity) {
          warnings.push({
            partNumber: removeItem.partNumber,
            requested: removeItem.quantity,
            available: totalAvailable
          });
        }
        
        // Subtract from oldest first (FIFO)
        let remainingToSubtract = removeItem.quantity;
        
        for (const item of matchingItems) {
          if (remainingToSubtract <= 0) break;
          
          const subtractFromThis = Math.min(item.quantity, remainingToSubtract);
          const newQuantity = item.quantity - subtractFromThis;
          remainingToSubtract -= subtractFromThis;
          
          // Always update quantity, even if it becomes 0 or negative
          const { error } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', item.id);
          
          if (error) throw error;
        }
      }
      
      // Refresh inventory after all updates
      await fetchInventory();
      
      return warnings;
    } catch (error) {
      console.error('Error subtracting from shoot list:', error);
      throw error;
    }
  }, [user, inventory]);

  // Add single item manually
  const addItem = useCallback(async (item) => {
    if (!user) {
      throw new Error('User must be logged in to add items');
    }

    try {
      const newItem = {
        user_id: user.id,
        order_id: item.orderId, // Should be provided
        part_number: item.partNumber,
        description: item.description,
        quantity: item.quantity,
        cost: item.cost,
        line_total: item.quantity * item.cost,
        packing: item.packing || '1/1',
        order_number: item.orderNumber || 'Manual Entry',
        order_date: new Date().toISOString().split('T')[0],
        vendor: item.vendor || 'Manual Entry'
      };

      const { data, error } = await supabase
        .from('inventory')
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      // Map database format to app format
      const mappedData = mapInventoryFromDB(data);

      setInventory(prev => [...prev, mappedData]);
      return mappedData;
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
    }
  }, [user]);

  // Update single item
  const updateItem = useCallback(async (id, updates) => {
    if (!user) {
      throw new Error('User must be logged in to update items');
    }

    try {
      const updateData = {};
      if (updates.partNumber !== undefined) updateData.part_number = updates.partNumber;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
      if (updates.cost !== undefined) updateData.cost = updates.cost;
      if (updates.lineTotal !== undefined) updateData.line_total = updates.lineTotal;
      if (updates.packing !== undefined) updateData.packing = updates.packing;

      const { data, error } = await supabase
        .from('inventory')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Map database format to app format
      const mappedData = mapInventoryFromDB(data);

      setInventory(prev => prev.map(item => 
        item.id === id ? mappedData : item
      ));

      return mappedData;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }, [user]);

  // Delete single item
  const deleteItem = useCallback(async (id) => {
    if (!user) {
      throw new Error('User must be logged in to delete items');
    }

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setInventory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }, [user]);

  // Delete all items from a specific order
  const deleteItemsByOrder = useCallback(async (orderNumber) => {
    if (!user) {
      throw new Error('User must be logged in to delete items');
    }

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('order_number', orderNumber)
        .eq('user_id', user.id);

      if (error) throw error;

      setInventory(prev => prev.filter(item => item.order_number !== orderNumber));
    } catch (error) {
      console.error('Error deleting items by order:', error);
      throw error;
    }
  }, [user]);

  // Clear all inventory
  const clearInventory = useCallback(async () => {
    if (!user) {
      throw new Error('User must be logged in to clear inventory');
    }

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setInventory([]);
    } catch (error) {
      console.error('Error clearing inventory:', error);
      throw error;
    }
  }, [user]);

  // Replace entire inventory (for imports)
  const replaceInventory = useCallback(async (items) => {
    if (!user) {
      throw new Error('User must be logged in to replace inventory');
    }

    try {
      // First, clear existing inventory
      await clearInventory();

      // Then add new items
      const newItems = items.map(item => ({
        user_id: user.id,
        order_id: item.orderId, // Should be provided
        part_number: item.partNumber || '',
        description: item.description || '',
        quantity: item.quantity || 0,
        cost: item.cost || 0,
        line_total: (item.quantity || 0) * (item.cost || 0),
        packing: item.packing || '1/1',
        order_number: item.orderNumber || 'Import',
        order_date: new Date().toISOString().split('T')[0],
        vendor: item.vendor || 'Import'
      }));

      if (newItems.length === 0) {
        setInventory([]);
        return [];
      }

      const { data, error } = await supabase
        .from('inventory')
        .insert(newItems)
        .select();

      if (error) throw error;

      // Map database format to app format
      const mappedData = data.map(mapInventoryFromDB);

      setInventory(mappedData);
      return mappedData;
    } catch (error) {
      console.error('Error replacing inventory:', error);
      throw error;
    }
  }, [user, clearInventory]);

  return {
    inventory,
    loading,
    addFromInvoice,
    subtractFromShootList,
    addItem,
    updateItem,
    deleteItem,
    deleteItemsByOrder,
    clearInventory,
    replaceInventory,
    refetch: fetchInventory
  };
};

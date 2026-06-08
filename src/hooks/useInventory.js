import { useState, useEffect, useCallback } from 'react';
import { loadInventory, saveInventory, addToHistory } from '../utils/storage';

export const useInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load inventory on mount
  useEffect(() => {
    const data = loadInventory();
    setInventory(data);
    setLoading(false);
  }, []);

  // Save inventory whenever it changes
  useEffect(() => {
    if (!loading) {
      saveInventory(inventory);
    }
  }, [inventory, loading]);

  // Add items from invoice (increases quantity)
  const addFromInvoice = useCallback((items, invoiceName = 'Invoice', orderNumber = null, orderDate = null) => {
    setInventory(prev => {
      const updated = [...prev];
      
      items.forEach(newItem => {
        // Instead of merging, always add as separate line item for FIFO tracking
        // Each order line is a separate inventory record
        updated.push({
          id: Date.now() + Math.random(),
          partNumber: newItem.partNumber,
          description: newItem.description,
          quantity: newItem.quantity,
          cost: newItem.cost,
          lineTotal: newItem.lineTotal, // Store exact line total from invoice
          cases: newItem.cases, // Number of cases
          packing: newItem.packing, // Shells per case
          orderNumber: orderNumber,
          orderDate: orderDate || new Date().toISOString() // Use provided date or current date
        });
      });
      
      return updated;
    });
    
    addToHistory({
      type: 'invoice',
      name: invoiceName,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
    });
  }, []);

  // Remove items from shoot list (decreases quantity) - uses FIFO
  const subtractFromShootList = useCallback((items, shootListName = 'Shoot List') => {
    const warnings = [];
    
    setInventory(prev => {
      let updated = [...prev];
      
      items.forEach(removeItem => {
        // Find all matching part numbers, sorted by order date (FIFO - oldest first)
        const matchingItems = updated
          .map((item, index) => ({ ...item, originalIndex: index }))
          .filter(item => item.partNumber.toLowerCase() === removeItem.partNumber.toLowerCase())
          .sort((a, b) => {
            // Sort by orderDate (oldest first)
            const dateA = new Date(a.orderDate || 0).getTime();
            const dateB = new Date(b.orderDate || 0).getTime();
            return dateA - dateB;
          });
        
        if (matchingItems.length === 0) {
          warnings.push({
            partNumber: removeItem.partNumber,
            requested: removeItem.quantity,
            available: 0,
            notFound: true
          });
          return;
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
        
        matchingItems.forEach(item => {
          if (remainingToSubtract <= 0) return;
          
          const subtractFromThis = Math.min(item.quantity, remainingToSubtract);
          const newQuantity = item.quantity - subtractFromThis;
          remainingToSubtract -= subtractFromThis;
          
          // Update the item in the updated array
          updated[item.originalIndex] = {
            ...updated[item.originalIndex],
            quantity: newQuantity
          };
        });
      });
      
      // Remove items with zero quantity
      updated = updated.filter(item => item.quantity > 0);
      
      return updated;
    });
    
    addToHistory({
      type: 'shoot_list',
      name: shootListName,
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      warnings: warnings.length > 0 ? warnings : undefined
    });
    
    return warnings;
  }, []);

  // Add single item manually
  const addItem = useCallback((item) => {
    setInventory(prev => [...prev, {
      id: Date.now() + Math.random(),
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.quantity,
      cost: item.cost,
      orderNumber: item.orderNumber || 'Manual Entry',
      orderDate: new Date().toISOString()
    }]);
  }, []);

  // Update single item
  const updateItem = useCallback((id, updates) => {
    setInventory(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  // Delete single item
  const deleteItem = useCallback((id) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  }, []);

  // Delete all items from a specific order
  const deleteItemsByOrder = useCallback((orderNumber) => {
    setInventory(prev => prev.filter(item => item.orderNumber !== orderNumber));
    addToHistory({
      type: 'order_delete',
      name: `Order ${orderNumber} items removed`
    });
  }, []);

  // Clear all inventory
  const clearInventory = useCallback(() => {
    setInventory([]);
    addToHistory({ type: 'clear', name: 'Inventory Cleared' });
  }, []);

  // Replace entire inventory (for imports)
  const replaceInventory = useCallback((items) => {
    const newInventory = items.map((item, index) => ({
      id: Date.now() + index,
      partNumber: item.partNumber || '',
      description: item.description || '',
      quantity: item.quantity || 0,
      cost: item.cost || 0
    }));
    setInventory(newInventory);
    addToHistory({
      type: 'import',
      name: 'Inventory Import',
      itemCount: items.length
    });
  }, []);

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
    replaceInventory
  };
};

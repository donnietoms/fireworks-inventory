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
  const addFromInvoice = useCallback((items, invoiceName = 'Invoice', orderNumber = null) => {
    setInventory(prev => {
      const updated = [...prev];
      
      items.forEach(newItem => {
        const existingIndex = updated.findIndex(
          item => item.partNumber.toLowerCase() === newItem.partNumber.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Update existing item
          const existing = updated[existingIndex];
          const newTotalQty = existing.quantity + newItem.quantity;
          
          // Calculate weighted average cost if both have costs
          let newCost = existing.cost;
          if (newItem.cost > 0) {
            if (existing.cost > 0 && existing.quantity > 0) {
              // Weighted average: (oldQty * oldCost + newQty * newCost) / totalQty
              newCost = ((existing.quantity * existing.cost) + (newItem.quantity * newItem.cost)) / newTotalQty;
              newCost = parseFloat(newCost.toFixed(2));
            } else {
              // No existing cost or quantity, use new cost
              newCost = newItem.cost;
            }
          }
          
          updated[existingIndex] = {
            ...existing,
            quantity: newTotalQty,
            cost: newCost,
            description: newItem.description || existing.description,
            orderNumber: orderNumber || existing.orderNumber
          };
        } else {
          // Add new item
          updated.push({
            id: Date.now() + Math.random(),
            partNumber: newItem.partNumber,
            description: newItem.description,
            quantity: newItem.quantity,
            cost: newItem.cost,
            orderNumber: orderNumber
          });
        }
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

  // Remove items from shoot list (decreases quantity)
  const subtractFromShootList = useCallback((items, shootListName = 'Shoot List') => {
    const warnings = [];
    
    setInventory(prev => {
      const updated = [...prev];
      
      items.forEach(removeItem => {
        const existingIndex = updated.findIndex(
          item => item.partNumber.toLowerCase() === removeItem.partNumber.toLowerCase()
        );
        
        if (existingIndex >= 0) {
          const newQuantity = updated[existingIndex].quantity - removeItem.quantity;
          
          if (newQuantity < 0) {
            warnings.push({
              partNumber: removeItem.partNumber,
              requested: removeItem.quantity,
              available: updated[existingIndex].quantity
            });
          }
          
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: Math.max(0, newQuantity)
          };
        } else {
          warnings.push({
            partNumber: removeItem.partNumber,
            requested: removeItem.quantity,
            available: 0,
            notFound: true
          });
        }
      });
      
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
      cost: item.cost
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

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'fireworks-orders';

/**
 * Hook to manage order/invoice records
 */
export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load orders from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedOrders = JSON.parse(stored);
        setOrders(parsedOrders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save orders to localStorage whenever they change
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } catch (error) {
        console.error('Error saving orders:', error);
      }
    }
  }, [orders, loading]);

  const addOrder = (order) => {
    const newOrder = {
      id: Date.now().toString(),
      ...order,
      createdAt: new Date().toISOString()
    };
    setOrders(prev => [newOrder, ...prev]);
    return newOrder;
  };

  const updateOrder = (id, updates) => {
    setOrders(prev => prev.map(order => 
      order.id === id ? { ...order, ...updates } : order
    ));
  };

  const deleteOrder = (id) => {
    setOrders(prev => prev.filter(order => order.id !== id));
  };

  const clearOrders = () => {
    setOrders([]);
  };

  return {
    orders,
    loading,
    addOrder,
    updateOrder,
    deleteOrder,
    clearOrders
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { mapOrderFromDB } from '../utils/dbMappers';

/**
 * Hook to manage order/invoice records with Supabase
 */
export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load orders from Supabase on mount and when user changes
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('order_date', { ascending: false });

      if (error) throw error;

      // Map database format to app format
      const mappedOrders = (data || []).map(mapOrderFromDB);
      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const addOrder = async (order) => {
    if (!user) {
      throw new Error('User must be logged in to add orders');
    }

    try {
      const newOrder = {
        user_id: user.id,
        order_number: order.orderNumber,
        vendor: order.vendor,
        order_date: order.orderDate,
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        total: order.total,
        invoice_pdf_url: order.invoiceFile || null, // Changed from invoicePdfUrl to invoiceFile
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([newOrder])
        .select()
        .single();

      if (error) throw error;

      // Map database format to app format
      const mappedOrder = mapOrderFromDB(data);
      setOrders(prev => [mappedOrder, ...prev]);
      return mappedOrder;
    } catch (error) {
      console.error('Error adding order:', error);
      throw error;
    }
  };

  const updateOrder = async (id, updates) => {
    if (!user) {
      throw new Error('User must be logged in to update orders');
    }

    try {
      const updateData = {};
      if (updates.orderNumber !== undefined) updateData.order_number = updates.orderNumber;
      if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
      if (updates.orderDate !== undefined) updateData.order_date = updates.orderDate;
      if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
      if (updates.discount !== undefined) updateData.discount = updates.discount;
      if (updates.total !== undefined) updateData.total = updates.total;
      if (updates.invoicePdfUrl !== undefined) updateData.invoice_pdf_url = updates.invoicePdfUrl;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const mappedOrder = mapOrderFromDB(data);
      setOrders(prev => prev.map(order => 
        order.id === id ? mappedOrder : order
      ));

      return mappedOrder;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  };

  const deleteOrder = async (id) => {
    if (!user) {
      throw new Error('User must be logged in to delete orders');
    }

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOrders(prev => prev.filter(order => order.id !== id));
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  };

  const clearOrders = async () => {
    if (!user) {
      throw new Error('User must be logged in to clear orders');
    }

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setOrders([]);
    } catch (error) {
      console.error('Error clearing orders:', error);
      throw error;
    }
  };

  return {
    orders,
    loading,
    addOrder,
    updateOrder,
    deleteOrder,
    clearOrders,
    refetch: fetchOrders
  };
}

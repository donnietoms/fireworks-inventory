import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { mapShowFromDB } from '../utils/dbMappers';

export const useShows = () => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load shows from Supabase on mount and when user changes
  useEffect(() => {
    if (!user) {
      setShows([]);
      setLoading(false);
      return;
    }

    fetchShows();
  }, [user]);

  const fetchShows = async () => {
    try {
      setLoading(true);
      
      // Fetch shows with their items
      const { data: showsData, error: showsError } = await supabase
        .from('shows')
        .select(`
          *,
          items:show_items(*)
        `)
        .order('show_date', { ascending: false });

      if (showsError) throw showsError;

      const mappedShows = (showsData || []).map(mapShowFromDB);
      setShows(mappedShows);
    } catch (error) {
      console.error('Error loading shows:', error);
      setShows([]);
    } finally {
      setLoading(false);
    }
  };

  // Add a new show
  const addShow = useCallback(async (showData) => {
    if (!user) {
      throw new Error('User must be logged in to add shows');
    }

    try {
      // Calculate totals
      const totalItems = showData.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
      const totalValue = showData.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.cost || 0)), 0) || 0;

      // Insert show
      const { data: show, error: showError } = await supabase
        .from('shows')
        .insert([{
          user_id: user.id,
          show_name: showData.name,
          show_date: showData.date,
          location: showData.location || '',
          total_value: totalValue
        }])
        .select()
        .single();

      if (showError) throw showError;

      // Insert show items
      if (showData.items && showData.items.length > 0) {
        const showItems = showData.items.map(item => ({
          user_id: user.id,
          show_id: show.id,
          part_number: item.partNumber,
          description: item.description,
          quantity: item.quantity,
          cost: item.cost,
          line_total: (item.quantity || 0) * (item.cost || 0),
          in_inventory: item.inInventory !== undefined ? item.inInventory : true
        }));

        const { error: itemsError } = await supabase
          .from('show_items')
          .insert(showItems);

        if (itemsError) throw itemsError;
      }

      // Refresh shows to get the complete data
      await fetchShows();

      return show.id;
    } catch (error) {
      console.error('Error adding show:', error);
      throw error;
    }
  }, [user]);

  // Update a show
  const updateShow = useCallback(async (id, updates) => {
    if (!user) {
      throw new Error('User must be logged in to update shows');
    }

    try {
      const updateData = {};
      if (updates.name !== undefined) updateData.show_name = updates.name;
      if (updates.date !== undefined) updateData.show_date = updates.date;
      if (updates.location !== undefined) updateData.location = updates.location;

      // If items are being updated, recalculate total value
      if (updates.items) {
        const totalValue = updates.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.cost || 0)), 0);
        updateData.total_value = totalValue;

        // Delete existing items and insert new ones
        const { error: deleteError } = await supabase
          .from('show_items')
          .delete()
          .eq('show_id', id);

        if (deleteError) throw deleteError;

        if (updates.items.length > 0) {
          const showItems = updates.items.map(item => ({
            user_id: user.id,
            show_id: id,
            part_number: item.partNumber,
            description: item.description,
            quantity: item.quantity,
            cost: item.cost,
            line_total: (item.quantity || 0) * (item.cost || 0),
            in_inventory: item.inInventory !== undefined ? item.inInventory : true
          }));

          const { error: itemsError } = await supabase
            .from('show_items')
            .insert(showItems);

          if (itemsError) throw itemsError;
        }
      }

      // Update the show
      const { error: updateError } = await supabase
        .from('shows')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Refresh shows
      await fetchShows();
    } catch (error) {
      console.error('Error updating show:', error);
      throw error;
    }
  }, [user]);

  // Delete a show
  const deleteShow = useCallback(async (id) => {
    if (!user) {
      throw new Error('User must be logged in to delete shows');
    }

    try {
      // Delete show (cascade will handle show_items)
      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShows(prev => prev.filter(show => show.id !== id));
    } catch (error) {
      console.error('Error deleting show:', error);
      throw error;
    }
  }, [user]);

  // Clear all shows
  const clearShows = useCallback(async () => {
    if (!user) {
      throw new Error('User must be logged in to clear shows');
    }

    try {
      const { error } = await supabase
        .from('shows')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setShows([]);
    } catch (error) {
      console.error('Error clearing shows:', error);
      throw error;
    }
  }, [user]);

  return {
    shows,
    loading,
    addShow,
    updateShow,
    deleteShow,
    clearShows,
    refetch: fetchShows
  };
};

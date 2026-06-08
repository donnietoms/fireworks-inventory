import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'fireworks-shows';

// Load shows from localStorage
export const loadShows = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading shows:', error);
    return [];
  }
};

// Save shows to localStorage
export const saveShows = (shows) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shows));
  } catch (error) {
    console.error('Error saving shows:', error);
  }
};

export const useShows = () => {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load shows on mount
  useEffect(() => {
    const data = loadShows();
    setShows(data);
    setLoading(false);
  }, []);

  // Save shows whenever they change
  useEffect(() => {
    if (!loading) {
      saveShows(shows);
    }
  }, [shows, loading]);

  // Add a new show
  const addShow = useCallback((showData) => {
    const newShow = {
      id: `show-${Date.now()}`,
      name: showData.name,
      date: showData.date,
      location: showData.location || '',
      items: showData.items || [],
      totalItems: showData.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      totalValue: showData.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.cost || 0)), 0) || 0,
      createdAt: new Date().toISOString()
    };

    setShows(prev => [...prev, newShow]);
    return newShow.id;
  }, []);

  // Update a show
  const updateShow = useCallback((id, updates) => {
    setShows(prev => prev.map(show => {
      if (show.id === id) {
        const updatedShow = { ...show, ...updates };
        // Recalculate totals if items changed
        if (updates.items) {
          updatedShow.totalItems = updates.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
          updatedShow.totalValue = updates.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.cost || 0)), 0);
        }
        return updatedShow;
      }
      return show;
    }));
  }, []);

  // Delete a show
  const deleteShow = useCallback((id) => {
    setShows(prev => prev.filter(show => show.id !== id));
  }, []);

  // Clear all shows
  const clearShows = useCallback(() => {
    setShows([]);
  }, []);

  return {
    shows,
    loading,
    addShow,
    updateShow,
    deleteShow,
    clearShows
  };
};

import { useState, useEffect, useCallback } from 'react';
import { loadReorderPoints, saveReorderPoints, setReorderPoint } from '../utils/storage';

export const useReorderPoints = () => {
  const [reorderPoints, setReorderPointsState] = useState({});
  const [loading, setLoading] = useState(true);

  // Load reorder points on mount
  useEffect(() => {
    const data = loadReorderPoints();
    setReorderPointsState(data);
    setLoading(false);
  }, []);

  // Save reorder points whenever they change
  useEffect(() => {
    if (!loading) {
      saveReorderPoints(reorderPoints);
    }
  }, [reorderPoints, loading]);

  // Set reorder point for a part number
  const updateReorderPoint = useCallback((partNumber, value) => {
    setReorderPointsState(prev => {
      const updated = { ...prev };
      if (value === null || value === 0 || value === '') {
        delete updated[partNumber];
      } else {
        updated[partNumber] = Math.max(0, parseInt(value) || 0);
      }
      return updated;
    });
  }, []);

  // Get reorder point for a part number
  const getReorderPoint = useCallback((partNumber) => {
    return reorderPoints[partNumber] || 0;
  }, [reorderPoints]);

  // Clear all reorder points
  const clearReorderPoints = useCallback(() => {
    setReorderPointsState({});
  }, []);

  return {
    reorderPoints,
    loading,
    updateReorderPoint,
    getReorderPoint,
    clearReorderPoints
  };
};

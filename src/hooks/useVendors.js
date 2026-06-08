import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

/**
 * Hook to fetch and cache supported vendors from backend
 */
export function useVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchVendors() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/vendors`);
        if (!response.ok) {
          throw new Error('Failed to fetch vendors');
        }
        const data = await response.json();
        setVendors(data.vendors || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching vendors:', err);
        setError(err.message);
        // Fallback to Wisley only
        setVendors([
          { id: 'wisley', name: 'Wisley Pyrotechnics', formats: ['pdf', 'xlsx', 'xls'] }
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchVendors();
  }, []);

  return { vendors, loading, error };
}

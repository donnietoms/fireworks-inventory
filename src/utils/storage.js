// Local storage utilities for inventory data

const STORAGE_KEY = 'fireworks_inventory';
const HISTORY_KEY = 'fireworks_history';
const REORDER_POINTS_KEY = 'fireworks_reorder_points';

// Load inventory from localStorage
export const loadInventory = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading inventory:', error);
    return [];
  }
};

// Save inventory to localStorage
export const saveInventory = (inventory) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    return true;
  } catch (error) {
    console.error('Error saving inventory:', error);
    return false;
  }
};

// Load transaction history
export const loadHistory = () => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

// Save transaction history
export const saveHistory = (history) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving history:', error);
    return false;
  }
};

// Add a transaction to history
export const addToHistory = (transaction) => {
  const history = loadHistory();
  history.unshift({
    ...transaction,
    id: Date.now(),
    timestamp: new Date().toISOString()
  });
  // Keep last 100 transactions
  if (history.length > 100) {
    history.pop();
  }
  saveHistory(history);
};

// Export inventory to JSON file
export const exportToJSON = (inventory) => {
  const dataStr = JSON.stringify(inventory, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fireworks_inventory_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

// Load reorder points (per part number)
export const loadReorderPoints = () => {
  try {
    const data = localStorage.getItem(REORDER_POINTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading reorder points:', error);
    return {};
  }
};

// Save reorder points
export const saveReorderPoints = (reorderPoints) => {
  try {
    localStorage.setItem(REORDER_POINTS_KEY, JSON.stringify(reorderPoints));
    return true;
  } catch (error) {
    console.error('Error saving reorder points:', error);
    return false;
  }
};

// Set reorder point for a part number
export const setReorderPoint = (partNumber, reorderPoint) => {
  const points = loadReorderPoints();
  if (reorderPoint === null || reorderPoint === 0) {
    delete points[partNumber];
  } else {
    points[partNumber] = reorderPoint;
  }
  saveReorderPoints(points);
  return points;
};

// Get reorder point for a part number
export const getReorderPoint = (partNumber) => {
  const points = loadReorderPoints();
  return points[partNumber] || 0;
};

// Import inventory from JSON file
export const importFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};

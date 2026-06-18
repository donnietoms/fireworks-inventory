import { loadReorderPoints } from './storage';

// Get status for an item based on packing format
// 25% of a case = CRITICAL (red)
// 50% of a case = WARNING (yellow)
export const getAlertStatus = (availableQuantity, reorderPoint, itemsPerCase) => {
  if (reorderPoint === null || reorderPoint === 0) {
    return 'NORMAL'; // No reorder point set
  }
  
  // Calculate thresholds based on case size
  let criticalThreshold, warningThreshold;
  
  if (itemsPerCase && itemsPerCase > 0) {
    // Thresholds based on case size
    criticalThreshold = reorderPoint + (itemsPerCase * 0.25); // 25% of a case above reorder point
    warningThreshold = reorderPoint + (itemsPerCase * 0.50);  // 50% of a case above reorder point
  } else {
    // Fallback if packing is unknown: use percentage-based thresholds
    criticalThreshold = reorderPoint * 0.5;
    warningThreshold = reorderPoint;
  }
  
  if (availableQuantity <= criticalThreshold) {
    return 'CRITICAL'; // Red - very low stock
  } else if (availableQuantity <= warningThreshold) {
    return 'WARNING'; // Yellow - below reorder point
  }
  
  return 'NORMAL'; // Green - above reorder point
};

// Get alert color for status
export const getAlertColor = (status) => {
  switch (status) {
    case 'CRITICAL':
      return '#f44336'; // Red
    case 'WARNING':
      return '#ff9800'; // Orange/Yellow
    default:
      return '#4CAF50'; // Green
  }
};

// Calculate available quantity for a part number (sum across all inventory items)
export const calculateAvailableQuantity = (inventory, partNumber) => {
  return inventory
    .filter(item => item.partNumber.toLowerCase() === partNumber.toLowerCase())
    .reduce((sum, item) => sum + (item.quantity || 0), 0);
};

// Get all low stock items
export const getLowStockItems = (inventory) => {
  const reorderPoints = loadReorderPoints();
  const processedPartNumbers = new Set();
  const lowStockItems = [];
  
  // Process each unique part number
  Object.keys(reorderPoints).forEach(partNumber => {
    const reorderPoint = reorderPoints[partNumber];
    const available = calculateAvailableQuantity(inventory, partNumber);
    
    // Find inventory item to get packing info
    const item = inventory.find(
      inv => inv.partNumber.toLowerCase() === partNumber.toLowerCase()
    );
    
    if (item) {
      const itemsPerCase = item.packagesPerCase && item.itemsPerPackage
        ? item.packagesPerCase * item.itemsPerPackage
        : null;
      
      const status = getAlertStatus(available, reorderPoint, itemsPerCase);
      
      if (status !== 'NORMAL') {
        lowStockItems.push({
          partNumber,
          description: item.description,
          available,
          reorderPoint,
          status,
          color: getAlertColor(status),
          itemsPerCase
        });
        processedPartNumbers.add(partNumber);
      }
    }
  });
  
  // Sort by status (CRITICAL first, then WARNING) and by part number
  lowStockItems.sort((a, b) => {
    const statusOrder = { CRITICAL: 0, WARNING: 1, NORMAL: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.partNumber.localeCompare(b.partNumber);
  });
  
  return lowStockItems;
};

// Count alerts by severity
export const countAlerts = (inventory) => {
  const lowStockItems = getLowStockItems(inventory);
  const critical = lowStockItems.filter(item => item.status === 'CRITICAL').length;
  const warning = lowStockItems.filter(item => item.status === 'WARNING').length;
  
  return {
    total: lowStockItems.length,
    critical,
    warning
  };
};

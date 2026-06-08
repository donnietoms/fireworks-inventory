import React from 'react';
import './InventoryList.css';

function InventoryList({ inventory, orderNumber, onViewDetails, onBack }) {
  if (inventory.length === 0) {
    return (
      <div className="empty-state">
        <p>No inventory items yet. Upload an invoice to get started.</p>
      </div>
    );
  }

  // Group inventory by part number
  const groupedInventory = inventory.reduce((acc, item) => {
    const key = item.partNumber;
    if (!acc[key]) {
      acc[key] = {
        partNumber: item.partNumber,
        description: item.description,
        items: [],
        totalQuantity: 0,
        totalValue: 0
      };
    }
    acc[key].items.push(item);
    acc[key].totalQuantity += item.quantity;
    // Use lineTotal if available, otherwise calculate from quantity * cost
    acc[key].totalValue += item.lineTotal || (item.quantity * item.cost);
    return acc;
  }, {});

  // Convert to array and calculate weighted average cost
  const summaryData = Object.values(groupedInventory).map(group => {
    const avgCost = group.totalQuantity > 0 ? group.totalValue / group.totalQuantity : 0;
    return {
      ...group,
      avgCost,
      orderCount: group.items.length
    };
  });

  // Sort by part number
  summaryData.sort((a, b) => a.partNumber.localeCompare(b.partNumber));

  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  const totalItems = summaryData.reduce((sum, item) => sum + item.totalQuantity, 0);
  const totalValue = summaryData.reduce((sum, item) => sum + item.totalValue, 0);

  return (
    <div className="inventory-list-container">
      {onBack && (
        <div className="inventory-header">
          <button onClick={onBack} className="btn-back">← Back to Orders</button>
          <h2>Inventory for Order #{orderNumber}</h2>
        </div>
      )}
      
      <div className="inventory-summary">
        <div className="summary-stat">
          <span className="stat-label">Unique Products:</span>
          <span className="stat-value">{summaryData.length}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Total Items:</span>
          <span className="stat-value">{totalItems}</span>
        </div>
        <div className="summary-stat">
          <span className="stat-label">Total Value:</span>
          <span className="stat-value">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      <div className="inventory-table-container">
        <table className="inventory-list-table">
          <thead>
            <tr>
              <th>Part Number</th>
              <th>Description</th>
              <th>Total Quantity</th>
              <th>Avg Cost/Unit</th>
              <th>Total Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((item, index) => (
              <tr key={index}>
                <td>
                  <button 
                    className="link-button"
                    onClick={() => onViewDetails(item.partNumber)}
                  >
                    {item.partNumber}
                  </button>
                </td>
                <td className="description-cell">{item.description}</td>
                <td>{item.totalQuantity}</td>
                <td>{formatCurrency(item.avgCost)}</td>
                <td>{formatCurrency(item.totalValue)}</td>
                <td>
                  <button
                    className="btn-view"
                    onClick={() => onViewDetails(item.partNumber)}
                    title="View Details"
                  >
                    📋
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan="2"><strong>TOTALS</strong></td>
              <td><strong>{totalItems}</strong></td>
              <td></td>
              <td><strong>{formatCurrency(totalValue)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default InventoryList;

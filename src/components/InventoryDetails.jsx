import React from 'react';
import './InventoryDetails.css';

function InventoryDetails({ partNumber, inventory, orderNumber, onBack, onUpdate, onDelete }) {
  // Filter inventory items for this part number
  const items = inventory.filter(item => item.partNumber === partNumber);

  if (items.length === 0) {
    return (
      <div className="inventory-details-empty">
        <p>No items found for {partNumber}.</p>
        <button onClick={onBack} className="btn-back">
          ← Back to {orderNumber ? `Order #${orderNumber}` : 'Inventory'}
        </button>
      </div>
    );
  }

  // Sort by order date (oldest first - FIFO order)
  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.orderDate || 0).getTime();
    const dateB = new Date(b.orderDate || 0).getTime();
    return dateA - dateB;
  });

  const totalQuantity = sortedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = sortedItems.reduce((sum, item) => sum + (item.lineTotal || (item.quantity * item.cost)), 0);
  const avgCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;

  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="inventory-details-container">
      <div className="inventory-details-header">
        <button onClick={onBack} className="btn-back">
          ← Back to {orderNumber ? `Order #${orderNumber}` : 'Inventory'}
        </button>
        <div className="part-info">
          <h2>{partNumber}</h2>
          <p className="description">{sortedItems[0].description}</p>
          <div className="part-metadata">
            <span><strong>Total Quantity:</strong> {totalQuantity}</span>
            <span><strong>Avg Cost/Unit:</strong> {formatCurrency(avgCost)}</span>
            <span><strong>Total Value:</strong> {formatCurrency(totalValue)}</span>
          </div>
        </div>
      </div>

      <div className="inventory-details-table-container">
        <table className="inventory-details-table">
          <thead>
            <tr>
              {!orderNumber && <th>Order #</th>}
              <th>Packing</th>
              <th>Quantity</th>
              <th>Cost/Unit</th>
              <th>Line Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, index) => (
              <tr key={item.id}>
                {!orderNumber && (
                  <td>
                    <span className="order-badge" title={index === 0 ? 'Oldest - Used first (FIFO)' : ''}>
                      {item.orderNumber}
                      {index === 0 && <span className="fifo-indicator" title="Next to be used (FIFO)">🔄</span>}
                    </span>
                  </td>
                )}
                <td>
                  {item.packagesPerCase && item.itemsPerPackage 
                    ? `${item.packagesPerCase}/${item.itemsPerPackage}` 
                    : '-'}
                </td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.cost)}</td>
                <td>{formatCurrency(item.lineTotal || (item.quantity * item.cost))}</td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => {
                      if (window.confirm(`Delete this line item from ${item.orderNumber}?`)) {
                        onDelete(item.id);
                      }
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td colSpan={orderNumber ? 1 : 2}><strong>TOTALS</strong></td>
              <td><strong>{totalQuantity}</strong></td>
              <td><strong>{formatCurrency(avgCost)}</strong></td>
              <td><strong>{formatCurrency(totalValue)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="fifo-note">
        <strong>ℹ️ FIFO (First In, First Out):</strong> Items are sorted by order date. When using inventory for shows, 
        the oldest items (marked with 🔄) are used first.
      </div>
    </div>
  );
}

export default InventoryDetails;

import React, { useState, useMemo } from 'react';
import { exportOrderToCSV, exportOrderToExcel } from '../utils/fileParser';
import './InventoryList.css';

function InventoryList({ inventory, orderNumber, order, onViewDetails, onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  if (inventory.length === 0) {
    return (
      <div className="empty-state">
        <p>No inventory items yet. Upload an invoice to get started.</p>
      </div>
    );
  }

  // Build complete order object with items from inventory for export
  const completeOrder = order ? {
    ...order,
    items: inventory.map(item => ({
      partNumber: item.partNumber,
      description: item.description,
      packagesPerCase: item.packagesPerCase,
      itemsPerPackage: item.itemsPerPackage,
      cases: item.cases,
      quantity: item.quantity,
      cost: item.cost,
      lineTotal: item.lineTotal || (item.quantity * item.cost)
    }))
  } : null;

  // Group inventory by part number and filter by search
  const summaryData = useMemo(() => {
    const groupedInventory = inventory.reduce((acc, item) => {
      const key = item.partNumber;
      if (!acc[key]) {
        acc[key] = {
          partNumber: item.partNumber,
          description: item.description,
          items: [],
          totalCases: 0,
          totalQuantity: 0,
          totalValue: 0
        };
      }
      acc[key].items.push(item);
      acc[key].totalCases += item.cases || 0;
      acc[key].totalQuantity += item.quantity;
      // Use lineTotal if available, otherwise calculate from quantity * cost
      acc[key].totalValue += item.lineTotal || (item.quantity * item.cost);
      return acc;
    }, {});

    // Convert to array and calculate weighted average cost
    let data = Object.values(groupedInventory).map(group => {
      const avgCost = group.totalQuantity > 0 ? group.totalValue / group.totalQuantity : 0;
      // Get packing from first item (all items in same order should have same packing)
      const firstItem = group.items[0];
      const packing = firstItem.packagesPerCase && firstItem.itemsPerPackage 
        ? `${firstItem.packagesPerCase}/${firstItem.itemsPerPackage}` 
        : '-';
      
      return {
        ...group,
        avgCost,
        packing,
        orderCount: group.items.length
      };
    });

    // Sort by part number
    data.sort((a, b) => a.partNumber.localeCompare(b.partNumber));

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      data = data.filter(item =>
        item.partNumber.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search)
      );
    }

    return data;
  }, [inventory, searchTerm]);

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
          {completeOrder && (
            <div className="export-buttons">
              <button 
                onClick={() => exportOrderToCSV(completeOrder)} 
                className="btn-export"
                title="Export to CSV"
              >
                📥 CSV
              </button>
              <button 
                onClick={() => exportOrderToExcel(completeOrder)} 
                className="btn-export"
                title="Export to Excel"
              >
                📥 XLS
              </button>
            </div>
          )}
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

      <div className="search-container">
        <input
          type="text"
          placeholder="Search by part number or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className="clear-search"
            title="Clear search"
          >
            ✕
          </button>
        )}
        {searchTerm && (
          <span className="search-results">
            Showing {summaryData.length} of {inventory.filter((item, idx, self) => self.findIndex(i => i.partNumber === item.partNumber) === idx).length} products
          </span>
        )}
      </div>

      <div className="inventory-table-container">
        <table className="inventory-list-table">
          <thead>
            <tr>
              <th style={{width: '100px'}}>Part Number</th>
              <th>Description</th>
              <th style={{width: '80px'}}>Packing</th>
              <th style={{width: '100px'}}>Qty Ordered</th>
              <th style={{width: '100px'}}>Total Qty</th>
              <th style={{width: '100px'}}>Avg Cost</th>
              <th style={{width: '100px'}}>Total Value</th>
              <th style={{width: '80px'}}>Actions</th>
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
                <td>{item.packing}</td>
                <td>{item.totalCases}</td>
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
              <td><strong>TOTALS</strong></td>
              <td></td>
              <td></td>
              <td></td>
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

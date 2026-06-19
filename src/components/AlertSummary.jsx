import React, { useMemo } from 'react';
import { getLowStockItems, countAlerts } from '../utils/alerts';
import './AlertSummary.css';

export const AlertSummary = ({ inventory, onSetReorderPoint }) => {
  const lowStockItems = useMemo(() => {
    return getLowStockItems(inventory).map(item => {
      // Find inventory item to get packing info
      const invItem = inventory.find(
        inv => inv.partNumber.toLowerCase() === item.partNumber.toLowerCase()
      );
      
      const itemsPerCase = invItem?.packagesPerCase && invItem?.itemsPerPackage
        ? invItem.packagesPerCase * invItem.itemsPerPackage
        : null;
      
      const packing = invItem?.packagesPerCase && invItem?.itemsPerPackage
        ? `${invItem.packagesPerCase}/${invItem.itemsPerPackage}`
        : '?/?';
      
      const estimatedCases = itemsPerCase 
        ? (item.reorderPoint / itemsPerCase).toFixed(1)
        : null;
      
      return {
        ...item,
        packing,
        itemsPerCase,
        estimatedCases
      };
    });
  }, [inventory]);
  
  const { total, critical, warning } = useMemo(() => countAlerts(inventory), [inventory]);

  if (total === 0) {
    return (
      <div className="alert-summary">
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <h2>All Stocked!</h2>
          <p>All items are above their reorder points.</p>
          <p className="hint">Set reorder points on items to receive alerts when stock is low.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-summary">
      <div className="alert-stats">
        <div className="stat-card critical">
          <div className="stat-number">{critical}</div>
          <div className="stat-label">Critical</div>
          <div className="stat-desc">≤ 25% of a case</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-number">{warning}</div>
          <div className="stat-label">Warning</div>
          <div className="stat-desc">≤ 50% of a case</div>
        </div>
        <div className="stat-card total">
          <div className="stat-number">{total}</div>
          <div className="stat-label">Total Alerts</div>
          <div className="stat-desc">Items below reorder point</div>
        </div>
      </div>

      <div className="alert-list">
        <h3>Low Stock Items</h3>
        <table className="alert-table">
          <thead>
            <tr>
              <th style={{ width: '3%' }}></th>
              <th style={{ width: '12%' }}>Part #</th>
              <th>Description</th>
              <th style={{ width: '8%' }}>Pack</th>
              <th style={{ width: '10%' }}>Available</th>
              <th style={{ width: '10%' }}>Reorder @</th>
              <th style={{ width: '7%' }}></th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.map((item) => (
              <tr key={item.partNumber} className={`alert-row ${item.status.toLowerCase()}`}>
                <td>
                  <div className="status-indicator" style={{ backgroundColor: item.color }}></div>
                </td>
                <td className="part-number">{item.partNumber}</td>
                <td className="description">{item.description}</td>
                <td className="packing-format">{item.packing}</td>
                <td className="quantity">{item.available}</td>
                <td className="reorder-column">
                  <div className="reorder-info">
                    <span className="items">{item.reorderPoint}</span>
                    {item.estimatedCases && (
                      <span className="cases">≈ {item.estimatedCases} cases</span>
                    )}
                  </div>
                </td>
                <td>
                  <button
                    className="btn-edit-reorder"
                    onClick={() => onSetReorderPoint(item)}
                    title="Edit reorder point"
                  >
                    ✏️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

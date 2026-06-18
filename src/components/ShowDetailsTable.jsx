import React from 'react';
import { exportShowToCSV, exportShowToExcel } from '../utils/fileParser';
import './ShowDetailsTable.css';

function ShowDetailsTable({ show, onBack }) {
  if (!show) {
    return (
      <div className="show-details-empty">
        <p>Show not found.</p>
        <button onClick={onBack} className="btn-back">← Back to Shows</button>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return value ? `$${value.toFixed(2)}` : '$0.00';
  };

  const calculateItemTotal = (item) => {
    return (item.quantity || 0) * (item.cost || 0);
  };

  return (
    <div className="show-details-container">
      <div className="show-details-header">
        <button onClick={onBack} className="btn-back">← Back to Shows</button>
        <div className="show-info">
          <h2>{show.name}</h2>
          <div className="show-metadata">
            <span><strong>Date:</strong> {show.date || 'N/A'}</span>
            <span><strong>Location:</strong> {show.location || 'N/A'}</span>
            <span><strong>Total Items:</strong> {show.totalItems}</span>
            <span><strong>Total Value:</strong> {formatCurrency(show.totalValue)}</span>
          </div>
        </div>
        <div className="export-buttons">
          <button 
            onClick={() => exportShowToCSV(show)} 
            className="btn-export"
            title="Export to CSV"
          >
            ⬇️ CSV
          </button>
          <button 
            onClick={() => exportShowToExcel(show)} 
            className="btn-export"
            title="Export to Excel"
          >
            ⬇️ XLS
          </button>
        </div>
      </div>

      <div className="show-items-table-container">
        <table className="show-items-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>Part Number</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Cost/Unit</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {show.items && show.items.length > 0 ? (
              show.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.size || 'N/A'}</td>
                  <td>{item.partNumber}</td>
                  <td className="description-cell">{item.description}</td>
                  <td>{item.quantity || 0}</td>
                  <td>{formatCurrency(item.cost)}</td>
                  <td>{formatCurrency(calculateItemTotal(item))}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-cell">No items in this show</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td><strong>TOTALS</strong></td>
              <td></td>
              <td></td>
              <td><strong>{show.totalItems}</strong></td>
              <td></td>
              <td><strong>{formatCurrency(show.totalValue)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default ShowDetailsTable;

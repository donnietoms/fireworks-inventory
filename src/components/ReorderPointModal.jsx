import React, { useState, useEffect } from 'react';
import './ReorderPointModal.css';

export const ReorderPointModal = ({ item, currentReorderPoint, onSave, onClose, inventory }) => {
  const [reorderPoint, setReorderPoint] = useState(currentReorderPoint || '');
  const [error, setError] = useState('');
  
  // Find packing information from inventory
  const inventoryItem = inventory?.find(
    inv => inv.partNumber.toLowerCase() === item.partNumber.toLowerCase()
  );
  
  const itemsPerCase = inventoryItem?.packagesPerCase && inventoryItem?.itemsPerPackage
    ? inventoryItem.packagesPerCase * inventoryItem.itemsPerPackage
    : null;
  
  const packing = inventoryItem?.packagesPerCase && inventoryItem?.itemsPerPackage
    ? `${inventoryItem.packagesPerCase}/${inventoryItem.itemsPerPackage}`
    : 'Unknown';

  useEffect(() => {
    setReorderPoint(currentReorderPoint || '');
  }, [currentReorderPoint]);

  const handleSave = () => {
    const value = parseInt(reorderPoint) || 0;
    
    if (value < 0) {
      setError('Reorder point must be 0 or greater');
      return;
    }

    onSave(item.partNumber, value);
    onClose();
  };

  const handleClear = () => {
    setReorderPoint('');
    onSave(item.partNumber, 0);
    onClose();
  };

  const calculateCases = (items) => {
    if (!itemsPerCase || items === '' || items === null) return null;
    return (items / itemsPerCase).toFixed(1);
  };

  const cases = calculateCases(reorderPoint);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Set Reorder Point</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="item-info">
            <div className="info-row">
              <span className="label">Part Number:</span>
              <span className="value">{item.partNumber}</span>
            </div>
            <div className="info-row">
              <span className="label">Description:</span>
              <span className="value">{item.description}</span>
            </div>
            <div className="info-row">
              <span className="label">Packing Format:</span>
              <span className="value">
                {packing}
                {itemsPerCase && <span className="packing-calc"> ({itemsPerCase} items/case)</span>}
              </span>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reorderPoint">
              Reorder Point (Quantity in Items)
              <span className="help-text">Alert when stock drops below this level</span>
            </label>
            <input
              id="reorderPoint"
              type="number"
              min="0"
              value={reorderPoint}
              onChange={(e) => {
                setReorderPoint(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Enter reorder point or leave blank"
              className="reorder-input"
            />
            {error && <div className="error-message">{error}</div>}
            
            {cases !== null && reorderPoint && (
              <div className="case-conversion">
                {reorderPoint} items ≈ <strong>{cases} cases</strong>
              </div>
            )}
          </div>

          <div className="info-box">
            <strong>How Alert Levels Work:</strong>
            <p>Alerts are based on <strong>case size</strong>, not just reorder point:</p>
            <ul>
              <li><span className="badge critical">●</span> Critical (Red): Stock ≤ reorder point + 25% of a case</li>
              <li><span className="badge warning">●</span> Warning (Yellow): Stock ≤ reorder point + 50% of a case</li>
              <li><span className="badge normal">●</span> Normal (Green): Stock above warning level</li>
            </ul>
            <p><strong>Example:</strong> For a 24/1 item with reorder point of 48:</p>
            <ul>
              <li>Warning at ≤72 items (48 + 24 × 0.5)</li>
              <li>Critical at ≤54 items (48 + 24 × 0.25)</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={handleClear} className="btn-secondary">
            Remove Alert
          </button>
          <button onClick={onClose} className="btn-cancel">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

import { useState } from 'react';
import './ManualShowModal.css';

const ManualShowModal = ({ isOpen, onClose, onAdd, existingShows = [], inventory = [] }) => {
  const [showData, setShowData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    location: ''
  });
  
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    partNumber: '',
    description: '',
    quantity: '',
    cost: ''
  });
  
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleShowChange = (field, value) => {
    setShowData(prev => ({ ...prev, [field]: value }));
    if (field === 'name' && error) {
      setError('');
    }
  };

  const handlePartNumberChange = (value) => {
    setCurrentItem(prev => ({ ...prev, partNumber: value }));
    
    // Search inventory for matching part numbers
    if (value.length > 0) {
      const results = inventory
        .filter(item => 
          item.partNumber.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5); // Limit to 5 results
      
      // Get unique part numbers with descriptions
      const uniqueResults = {};
      results.forEach(item => {
        if (!uniqueResults[item.partNumber]) {
          uniqueResults[item.partNumber] = item;
        }
      });
      
      setSearchResults(Object.values(uniqueResults));
    } else {
      setSearchResults([]);
    }
  };

  const selectInventoryItem = (item) => {
    setCurrentItem({
      partNumber: item.partNumber,
      description: item.description,
      quantity: '',
      cost: item.cost.toFixed(2)
    });
    setSearchResults([]);
  };

  const handleItemChange = (field, value) => {
    setCurrentItem(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    if (!currentItem.partNumber || !currentItem.description || !currentItem.quantity) {
      setError('Please fill in part number, description, and quantity');
      return;
    }

    const newItem = {
      partNumber: currentItem.partNumber,
      description: currentItem.description,
      quantity: parseInt(currentItem.quantity),
      cost: parseFloat(currentItem.cost) || 0
    };

    setItems(prev => [...prev, newItem]);
    
    // Reset current item
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      cost: ''
    });
    
    setError('');
    setSearchResults([]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    
    // Check for duplicate show name
    const isDuplicate = existingShows.some(
      show => show.name === showData.name
    );
    
    if (isDuplicate) {
      setError(`Show "${showData.name}" already exists!`);
      return;
    }
    
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
    
    onAdd({
      name: showData.name,
      date: showData.date,
      location: showData.location,
      items: items,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      totalValue: totalValue
    });
    
    // Reset form
    setShowData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      location: ''
    });
    setItems([]);
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      cost: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Manual Show Entry</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Show Header */}
          <div className="form-section">
            <h3>Show Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Show Name *</label>
                <input
                  type="text"
                  value={showData.name}
                  onChange={(e) => handleShowChange('name', e.target.value)}
                  required
                  placeholder="Bogue 2026 Dedication"
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={showData.date}
                  onChange={(e) => handleShowChange('date', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={showData.location}
                  onChange={(e) => handleShowChange('location', e.target.value)}
                  placeholder="City Park"
                />
              </div>
            </div>
          </div>

          {/* Add Item Section */}
          <div className="form-section">
            <h3>Add Items</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Part Number *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={currentItem.partNumber}
                    onChange={(e) => handlePartNumberChange(e.target.value)}
                    placeholder="Type to search inventory..."
                    autoComplete="off"
                  />
                  {searchResults.length > 0 && (
                    <div className="search-dropdown">
                      {searchResults.map((item, index) => (
                        <div 
                          key={index}
                          className="search-result-item"
                          onClick={() => selectInventoryItem(item)}
                        >
                          <strong>{item.partNumber}</strong> - {item.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={currentItem.description}
                  onChange={(e) => handleItemChange('description', e.target.value)}
                  placeholder="Product description"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) => handleItemChange('quantity', e.target.value)}
                  placeholder="10"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Cost per Unit (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentItem.cost}
                  onChange={(e) => handleItemChange('cost', e.target.value)}
                  placeholder="0.00"
                  min="0"
                />
              </div>
              <div className="form-group">
                <button type="button" onClick={addItem} className="btn-add-item">
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="form-section">
              <h3>Items ({items.length})</h3>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Part Number</th>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.partNumber}</td>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>${item.cost.toFixed(2)}</td>
                      <td>${(item.quantity * item.cost).toFixed(2)}</td>
                      <td>
                        <button 
                          type="button" 
                          onClick={() => removeItem(index)}
                          className="btn-remove"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="totals-row">
                    <td colSpan="2"><strong>TOTALS</strong></td>
                    <td><strong>{totalQuantity}</strong></td>
                    <td></td>
                    <td><strong>${totalValue.toFixed(2)}</strong></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Create Show
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualShowModal;

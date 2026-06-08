import { useState } from 'react';
import './AddItemModal.css';

const AddItemModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    partNumber: '',
    description: '',
    quantity: '',
    cost: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.partNumber.trim()) {
      alert('Part Number is required');
      return;
    }
    
    onAdd({
      partNumber: formData.partNumber.trim(),
      description: formData.description.trim(),
      quantity: parseFloat(formData.quantity) || 0,
      cost: parseFloat(formData.cost) || 0
    });
    
    setFormData({
      partNumber: '',
      description: '',
      quantity: '',
      cost: ''
    });
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Add New Item</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Part Number *</label>
            <input
              type="text"
              value={formData.partNumber}
              onChange={(e) => handleChange('partNumber', e.target.value)}
              placeholder="e.g., FW-500-RED"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="e.g., 500g Red Peony Shell"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            
            <div className="form-group">
              <label>Cost ($)</label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => handleChange('cost', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-add">
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;

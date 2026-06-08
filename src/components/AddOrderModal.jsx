import { useState } from 'react';
import './AddOrderModal.css';

const AddOrderModal = ({ isOpen, onClose, onAdd, existingOrders = [] }) => {
  const [formData, setFormData] = useState({
    vendor: '',
    orderNumber: '',
    subtotal: '',
    discount: '0',
    total: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check for duplicate order number
    const isDuplicate = existingOrders.some(
      order => order.orderNumber === formData.orderNumber
    );
    
    if (isDuplicate) {
      setError(`Order number ${formData.orderNumber} already exists!`);
      return;
    }
    
    const subtotal = parseFloat(formData.subtotal) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const total = parseFloat(formData.total) || subtotal - discount;
    
    onAdd({
      vendor: formData.vendor,
      orderNumber: formData.orderNumber,
      subtotal,
      discount,
      total
    });
    
    // Reset form
    setFormData({
      vendor: '',
      orderNumber: '',
      subtotal: '',
      discount: '0',
      total: ''
    });
    setError('');
    
    onClose();
  };

  const handleChange = (field, value) => {
    // Clear error when user types
    if (field === 'orderNumber' && error) {
      setError('');
    }
    
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate total if subtotal or discount changes
      if (field === 'subtotal' || field === 'discount') {
        const subtotal = parseFloat(updated.subtotal) || 0;
        const discount = parseFloat(updated.discount) || 0;
        updated.total = (subtotal - discount).toFixed(2);
      }
      
      return updated;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Order</h2>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="vendor">Vendor *</label>
            <input
              id="vendor"
              type="text"
              value={formData.vendor}
              onChange={(e) => handleChange('vendor', e.target.value)}
              required
              placeholder="Wisley Pyrotechnics"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="orderNumber">Order Number *</label>
            <input
              id="orderNumber"
              type="text"
              value={formData.orderNumber}
              onChange={(e) => handleChange('orderNumber', e.target.value)}
              required
              placeholder="101628"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="subtotal">Subtotal *</label>
            <input
              id="subtotal"
              type="number"
              step="0.01"
              min="0"
              value={formData.subtotal}
              onChange={(e) => handleChange('subtotal', e.target.value)}
              required
              placeholder="0.00"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="discount">Discount</label>
            <input
              id="discount"
              type="number"
              step="0.01"
              min="0"
              value={formData.discount}
              onChange={(e) => handleChange('discount', e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="total">Total *</label>
            <input
              id="total"
              type="number"
              step="0.01"
              min="0"
              value={formData.total}
              onChange={(e) => handleChange('total', e.target.value)}
              required
              placeholder="0.00"
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Add Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOrderModal;

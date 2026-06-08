import { useState } from 'react';
import './ManualOrderModal.css';

const ManualOrderModal = ({ isOpen, onClose, onAdd, existingOrders = [], inventory = [] }) => {
  const [orderData, setOrderData] = useState({
    vendor: 'Wisley',
    orderNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    subtotal: 0,
    discount: 0,
    total: 0
  });
  
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    partNumber: '',
    description: '',
    quantity: '',
    cost: '',
    lineTotal: ''
  });
  
  const [error, setError] = useState('');

  const handleOrderChange = (field, value) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
    if (field === 'orderNumber' && error) {
      setError('');
    }
  };

  const handleItemChange = (field, value) => {
    setCurrentItem(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate lineTotal if quantity or cost changes
      if (field === 'quantity' || field === 'cost') {
        const qty = parseFloat(updated.quantity) || 0;
        const cost = parseFloat(updated.cost) || 0;
        updated.lineTotal = (qty * cost).toFixed(2);
      }
      
      return updated;
    });
  };

  const addItem = () => {
    if (!currentItem.partNumber || !currentItem.description || !currentItem.quantity || !currentItem.cost) {
      setError('Please fill in all item fields');
      return;
    }

    const newItem = {
      partNumber: currentItem.partNumber,
      description: currentItem.description,
      quantity: parseInt(currentItem.quantity),
      cost: parseFloat(currentItem.cost),
      lineTotal: parseFloat(currentItem.lineTotal)
    };

    setItems(prev => [...prev, newItem]);
    
    // Reset current item
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      cost: '',
      lineTotal: ''
    });
    
    // Recalculate order totals
    const newSubtotal = [...items, newItem].reduce((sum, item) => sum + item.lineTotal, 0);
    setOrderData(prev => ({
      ...prev,
      subtotal: newSubtotal,
      total: newSubtotal - prev.discount
    }));
    
    setError('');
  };

  const removeItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    
    // Recalculate totals
    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    setOrderData(prev => ({
      ...prev,
      subtotal: newSubtotal,
      total: newSubtotal - prev.discount
    }));
  };

  const handleDiscountChange = (value) => {
    const discount = parseFloat(value) || 0;
    setOrderData(prev => ({
      ...prev,
      discount,
      total: prev.subtotal - discount
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (items.length === 0) {
      setError('Please add at least one item');
      return;
    }
    
    // Check for duplicate order number
    const isDuplicate = existingOrders.some(
      order => order.orderNumber === orderData.orderNumber
    );
    
    if (isDuplicate) {
      setError(`Order number ${orderData.orderNumber} already exists!`);
      return;
    }
    
    onAdd({
      order: {
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate,
        vendor: orderData.vendor,
        subtotal: orderData.subtotal,
        discount: orderData.discount,
        total: orderData.total,
        itemCount: items.length
      },
      items: items.map(item => ({
        ...item,
        orderNumber: orderData.orderNumber,
        orderDate: orderData.orderDate
      }))
    });
    
    // Reset form
    setOrderData({
      vendor: 'Wisley',
      orderNumber: '',
      orderDate: new Date().toISOString().split('T')[0],
      subtotal: 0,
      discount: 0,
      total: 0
    });
    setItems([]);
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      cost: '',
      lineTotal: ''
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Manual Order Entry</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Order Header */}
          <div className="form-section">
            <h3>Order Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Vendor *</label>
                <input
                  type="text"
                  value={orderData.vendor}
                  onChange={(e) => handleOrderChange('vendor', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Order Number *</label>
                <input
                  type="text"
                  value={orderData.orderNumber}
                  onChange={(e) => handleOrderChange('orderNumber', e.target.value)}
                  required
                  placeholder="101628"
                />
              </div>
              <div className="form-group">
                <label>Order Date *</label>
                <input
                  type="date"
                  value={orderData.orderDate}
                  onChange={(e) => handleOrderChange('orderDate', e.target.value)}
                  required
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
                <input
                  type="text"
                  value={currentItem.partNumber}
                  onChange={(e) => handleItemChange('partNumber', e.target.value)}
                  placeholder="FK-5-BSW"
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={currentItem.description}
                  onChange={(e) => handleItemChange('description', e.target.value)}
                  placeholder="5 inch shell"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantity (shells) *</label>
                <input
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) => handleItemChange('quantity', e.target.value)}
                  placeholder="18"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Cost per Shell *</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentItem.cost}
                  onChange={(e) => handleItemChange('cost', e.target.value)}
                  placeholder="14.11"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Line Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentItem.lineTotal}
                  onChange={(e) => handleItemChange('lineTotal', e.target.value)}
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
                    <th>Line Total</th>
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
                      <td>${item.lineTotal.toFixed(2)}</td>
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
              </table>
            </div>
          )}

          {/* Order Totals */}
          <div className="form-section">
            <h3>Order Totals</h3>
            <div className="totals-row">
              <div className="form-group">
                <label>Subtotal</label>
                <input
                  type="number"
                  step="0.01"
                  value={orderData.subtotal.toFixed(2)}
                  readOnly
                  disabled
                />
              </div>
              <div className="form-group">
                <label>Discount</label>
                <input
                  type="number"
                  step="0.01"
                  value={orderData.discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={orderData.total.toFixed(2)}
                  readOnly
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualOrderModal;

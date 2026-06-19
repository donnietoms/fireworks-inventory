import { useState, useEffect } from 'react';
import './ManualOrderModal.css';

const ManualOrderModal = ({ isOpen, onClose, onAdd, existingOrders = [], editingOrder = null, inventory = [] }) => {
  const [orderData, setOrderData] = useState({
    vendor: 'Wisley',
    orderNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    subtotal: 0,
    discount: 0,
    total: 0
  });
  
  const [items, setItems] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null); // Track which item is being edited
  const [editingItem, setEditingItem] = useState(null); // Store inline edited item data
  const [currentItem, setCurrentItem] = useState({
    partNumber: '',
    description: '',
    quantity: '',
    packagesPerCase: '',
    itemsPerPackage: '',
    lineTotal: '',
    totalItems: null,
    costPerItem: null
  });
  
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editingOrder) {
      setOrderData({
        vendor: editingOrder.vendor,
        orderNumber: editingOrder.orderNumber,
        orderDate: editingOrder.createdAt ? new Date(editingOrder.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        subtotal: editingOrder.subtotal,
        discount: editingOrder.discount,
        total: editingOrder.total
      });
      setItems(editingOrder.items || []);
    } else {
      // Reset form when not editing
      setOrderData({
        vendor: 'Wisley',
        orderNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
        subtotal: 0,
        discount: 0,
        total: 0
      });
      setItems([]);
    }
  }, [editingOrder]);

  const handleOrderChange = (field, value) => {
    setOrderData(prev => ({ ...prev, [field]: value }));
    if (field === 'orderNumber' && error) {
      setError('');
    }
  };

  const handleItemChange = (field, value) => {
    setCurrentItem(prev => {
      const updated = { ...prev, [field]: value };
      
      // Calculate total items: quantity × packagesPerCase × itemsPerPackage
      const qty = parseFloat(updated.quantity) || 0;
      const pkgPerCase = parseFloat(updated.packagesPerCase) || 0;
      const itemsPerPkg = parseFloat(updated.itemsPerPackage) || 0;
      
      if (qty > 0 && pkgPerCase > 0 && itemsPerPkg > 0) {
        updated.totalItems = qty * pkgPerCase * itemsPerPkg;
      } else if (qty > 0 && (!pkgPerCase || !itemsPerPkg)) {
        // If no packing, totalItems = quantity
        updated.totalItems = qty;
      } else {
        updated.totalItems = null;
      }
      
      // Calculate cost per item: lineTotal ÷ totalItems
      const lineTotal = parseFloat(updated.lineTotal) || 0;
      if (updated.totalItems && updated.totalItems > 0 && lineTotal > 0) {
        updated.costPerItem = lineTotal / updated.totalItems;
      } else {
        updated.costPerItem = null;
      }
      
      return updated;
    });
  };

  const addItem = () => {
    if (!currentItem.partNumber || !currentItem.description || !currentItem.quantity || !currentItem.lineTotal) {
      setError('Please fill in part number, description, quantity, and line total');
      return;
    }

    const qty = parseInt(currentItem.quantity);
    const pkgPerCase = currentItem.packagesPerCase ? parseInt(currentItem.packagesPerCase) : null;
    const itemsPerPkg = currentItem.itemsPerPackage ? parseInt(currentItem.itemsPerPackage) : null;
    const lineTotal = parseFloat(currentItem.lineTotal);
    
    // Calculate total items and packing
    let totalItems, packing;
    if (pkgPerCase && itemsPerPkg) {
      totalItems = qty * pkgPerCase * itemsPerPkg;
      packing = pkgPerCase * itemsPerPkg;
    } else {
      totalItems = qty;
      packing = null;
    }
    
    const costPerItem = totalItems > 0 ? lineTotal / totalItems : 0;

    const newItem = {
      partNumber: currentItem.partNumber,
      description: currentItem.description,
      cases: qty, // Quantity from invoice (cases or units)
      quantity: totalItems, // Total items
      packing: packing, // Total items per case
      packagesPerCase: pkgPerCase,
      itemsPerPackage: itemsPerPkg,
      cost: costPerItem,
      lineTotal: lineTotal
    };

    if (editingItemIndex !== null) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = newItem;
      setItems(updatedItems);
      setEditingItemIndex(null);
      
      // Recalculate order totals
      const newSubtotal = updatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      setOrderData(prev => ({
        ...prev,
        subtotal: newSubtotal,
        total: newSubtotal - prev.discount
      }));
    } else {
      // Add new item
      setItems(prev => [...prev, newItem]);
      
      // Recalculate order totals
      const newSubtotal = [...items, newItem].reduce((sum, item) => sum + item.lineTotal, 0);
      setOrderData(prev => ({
        ...prev,
        subtotal: newSubtotal,
        total: newSubtotal - prev.discount
      }));
    }
    
    // Reset current item
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      packagesPerCase: '',
      itemsPerPackage: '',
      lineTotal: '',
      totalItems: null,
      costPerItem: null
    });
    
    setError('');
  };

  const editItem = (index) => {
    const item = items[index];
    setCurrentItem({
      partNumber: item.partNumber,
      description: item.description,
      quantity: item.cases?.toString() || '',
      packagesPerCase: item.packagesPerCase?.toString() || '',
      itemsPerPackage: item.itemsPerPackage?.toString() || '',
      lineTotal: item.lineTotal?.toString() || '',
      totalItems: item.quantity,
      costPerItem: item.cost
    });
    setEditingItem({ ...item }); // Also set for inline editing
    setEditingItemIndex(index);
  };

  const updateEditingItem = () => {
    if (editingItemIndex !== null && editingItem) {
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = editingItem;
      setItems(updatedItems);
      
      // Recalculate totals
      const newSubtotal = updatedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      setOrderData(prev => ({
        ...prev,
        subtotal: newSubtotal,
        total: newSubtotal - prev.discount
      }));
      
      setEditingItemIndex(null);
      setEditingItem(null);
    }
  };

  const cancelEdit = () => {
    setCurrentItem({
      partNumber: '',
      description: '',
      quantity: '',
      packagesPerCase: '',
      itemsPerPackage: '',
      lineTotal: '',
      totalItems: null,
      costPerItem: null
    });
    setEditingItemIndex(null);
    setEditingItem(null);
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
    
    // Check for duplicate order number (skip if editing the same order)
    const isDuplicate = existingOrders.some(
      order => order.orderNumber === orderData.orderNumber && 
      (!editingOrder || order.id !== editingOrder.id)
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
        <h2>{editingOrder ? 'Edit Order' : 'Manual Order Entry'}</h2>
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
                <label>Quantity (from invoice) *</label>
                <input
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) => handleItemChange('quantity', e.target.value)}
                  placeholder="Cases or units ordered"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Packages per Case (X in X/Y)</label>
                <input
                  type="number"
                  value={currentItem.packagesPerCase}
                  onChange={(e) => handleItemChange('packagesPerCase', e.target.value)}
                  placeholder="e.g., 9"
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Items per Package (Y in X/Y)</label>
                <input
                  type="number"
                  value={currentItem.itemsPerPackage}
                  onChange={(e) => handleItemChange('itemsPerPackage', e.target.value)}
                  placeholder="e.g., 4"
                  min="1"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Line Total *</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentItem.lineTotal}
                  onChange={(e) => handleItemChange('lineTotal', e.target.value)}
                  placeholder="Total from invoice"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Total Items (calculated)</label>
                <input
                  type="text"
                  value={currentItem.totalItems || ''}
                  disabled
                  placeholder="Auto-calculated"
                  style={{ backgroundColor: '#f0f0f0' }}
                />
              </div>
              <div className="form-group">
                <label>Cost per Item (calculated)</label>
                <input
                  type="text"
                  value={currentItem.costPerItem ? `$${currentItem.costPerItem.toFixed(4)}` : ''}
                  disabled
                  placeholder="Auto-calculated"
                  style={{ backgroundColor: '#f0f0f0' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button type="button" onClick={addItem} className="btn-add-item" style={{ flex: '1' }}>
                  {editingItemIndex !== null ? '✓ Update Item' : '+ Add Item'}
                </button>
                {editingItemIndex !== null && (
                  <button type="button" onClick={cancelEdit} className="btn-cancel" style={{ flex: '1' }}>
                    Cancel
                  </button>
                )}
                {editingOrder && (
                  <button type="submit" className="btn-submit" style={{ flex: '1' }}>
                    Update Order
                  </button>
                )}
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
                    <th>Packing</th>
                    <th>Qty Ordered</th>
                    <th>Total Items</th>
                    <th>Cost/Item</th>
                    <th>Line Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} style={editingItemIndex === index ? { backgroundColor: '#fff3cd' } : {}}>
                      <td>
                        {editingItemIndex === index ? (
                          <input
                            type="text"
                            value={editingItem.partNumber}
                            onChange={(e) => setEditingItem({ ...editingItem, partNumber: e.target.value })}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        ) : (
                          item.partNumber
                        )}
                      </td>
                      <td>
                        {editingItemIndex === index ? (
                          <input
                            type="text"
                            value={editingItem.description}
                            onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        ) : (
                          item.description
                        )}
                      </td>
                      <td>
                        {editingItemIndex === index ? (
                          <input
                            type="text"
                            value={editingItem.packagesPerCase && editingItem.itemsPerPackage 
                              ? `${editingItem.packagesPerCase}/${editingItem.itemsPerPackage}` 
                              : ''}
                            onChange={(e) => {
                              const [pkg, itemPkg] = e.target.value.split('/').map(n => parseInt(n) || 0);
                              setEditingItem({ 
                                ...editingItem, 
                                packagesPerCase: pkg, 
                                itemsPerPackage: itemPkg 
                              });
                            }}
                            placeholder="X/Y"
                            style={{ width: '100%', padding: '4px' }}
                          />
                        ) : (
                          item.packagesPerCase && item.itemsPerPackage 
                            ? `${item.packagesPerCase}/${item.itemsPerPackage}` 
                            : '-'
                        )}
                      </td>
                      <td>
                        {editingItemIndex === index ? (
                          <input
                            type="number"
                            value={editingItem.cases}
                            onChange={(e) => setEditingItem({ ...editingItem, cases: parseInt(e.target.value) || 0 })}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        ) : (
                          item.cases
                        )}
                      </td>
                      <td>
                        {editingItemIndex === index ? (
                          <input
                            type="number"
                            value={editingItem.quantity}
                            onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 0 })}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        ) : (
                          item.quantity
                        )}
                      </td>
                      <td>
                        {editingItemIndex === index ? (
                          <input
                            type="number"
                            step="0.0001"
                            value={editingItem.cost}
                            onChange={(e) => setEditingItem({ ...editingItem, cost: parseFloat(e.target.value) || 0 })}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        ) : (
                          `$${item.cost.toFixed(4)}`
                        )}
                      </td>
                      <td>
                        {editingItemIndex === index ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editingItem.lineTotal}
                            onChange={(e) => setEditingItem({ ...editingItem, lineTotal: parseFloat(e.target.value) || 0 })}
                            style={{ width: '100%', padding: '4px' }}
                          />
                        ) : (
                          `$${item.lineTotal.toFixed(2)}`
                        )}
                      </td>
                      <td>
                        {editingItemIndex === index ? (
                          <>
                            <button 
                              type="button" 
                              onClick={() => updateEditingItem()}
                              className="btn-save"
                              style={{ marginRight: '5px' }}
                              title="Save"
                            >
                              ✓
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setEditingItemIndex(null)}
                              className="btn-cancel"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              type="button" 
                              onClick={() => editItem(index)}
                              className="btn-edit"
                              style={{ marginRight: '5px' }}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button 
                              type="button" 
                              onClick={() => removeItem(index)}
                              className="btn-remove"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </>
                        )}
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

          {!editingOrder && (
            <div className="modal-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                Create Order
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ManualOrderModal;

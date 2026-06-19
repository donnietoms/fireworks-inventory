import { useState, useMemo } from 'react';
import './InventoryTable.css';

const InventoryTable = ({ inventory, onUpdate, onDelete, onOrderClick }) => {
  const [sortField, setSortField] = useState('partNumber');
  const [sortDirection, setSortDirection] = useState('asc');
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Filter and sort inventory
  const displayedInventory = useMemo(() => {
    let filtered = inventory;
    
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = inventory.filter(item =>
        item.partNumber.toLowerCase().includes(lowerFilter) ||
        item.description.toLowerCase().includes(lowerFilter)
      );
    }
    
    return [...filtered].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [inventory, filter, sortField, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    return displayedInventory.reduce((acc, item) => ({
      quantity: acc.quantity + item.quantity,
      value: acc.value + (item.quantity * item.cost)
    }), { quantity: 0, value: 0 });
  }, [displayedInventory]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValues({
      partNumber: item.partNumber,
      description: item.description,
      orderNumber: item.orderNumber || '',
      quantity: item.quantity,
      cost: item.cost
    });
  };

  const saveEdit = () => {
    onUpdate(editingId, {
      partNumber: editValues.partNumber,
      description: editValues.description,
      orderNumber: editValues.orderNumber || null,
      quantity: parseFloat(editValues.quantity) || 0,
      cost: parseFloat(editValues.cost) || 0
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="inventory-table-container">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search by part number or description..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
        <div className="table-stats">
          <span>{displayedInventory.length} items</span>
          <span>Total Qty: {totals.quantity.toLocaleString()}</span>
          <span>Total Value: ${totals.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('partNumber')} style={{ width: '15%' }}>
                Part Number <SortIcon field="partNumber" />
              </th>
              <th onClick={() => handleSort('description')} style={{ width: '35%' }}>
                Description <SortIcon field="description" />
              </th>
              <th onClick={() => handleSort('orderNumber')} style={{ width: '12%' }}>
                Order # <SortIcon field="orderNumber" />
              </th>
              <th onClick={() => handleSort('quantity')} style={{ width: '10%' }}>
                Quantity <SortIcon field="quantity" />
              </th>
              <th onClick={() => handleSort('cost')} style={{ width: '10%' }}>
                Cost <SortIcon field="cost" />
              </th>
              <th style={{ width: '18%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedInventory.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-message">
                  No inventory items. Upload an invoice to get started.
                </td>
              </tr>
            ) : (
              displayedInventory.map(item => (
                <tr key={item.id} className={item.quantity === 0 ? 'out-of-stock' : item.quantity < 5 ? 'low-stock' : ''}>
                  {editingId === item.id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editValues.partNumber}
                          onChange={(e) => setEditValues(prev => ({ ...prev, partNumber: e.target.value }))}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editValues.description}
                          onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editValues.orderNumber || ''}
                          onChange={(e) => setEditValues(prev => ({ ...prev, orderNumber: e.target.value }))}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editValues.quantity}
                          onChange={(e) => setEditValues(prev => ({ ...prev, quantity: e.target.value }))}
                          className="edit-input"
                          min="0"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editValues.cost}
                          onChange={(e) => setEditValues(prev => ({ ...prev, cost: e.target.value }))}
                          className="edit-input"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="actions">
                        <button onClick={saveEdit} className="btn-save">Save</button>
                        <button onClick={cancelEdit} className="btn-cancel">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{item.partNumber}</td>
                      <td>{item.description}</td>
                      <td 
                        className="order-number"
                        onClick={item.orderNumber ? onOrderClick : undefined}
                        style={{ cursor: item.orderNumber ? 'pointer' : 'default' }}
                        title={item.orderNumber ? 'Click to view orders' : ''}
                      >
                        {item.orderNumber || '-'}
                      </td>
                      <td className="quantity">{item.quantity}</td>
                      <td className="cost">${item.cost.toFixed(2)}</td>
                      <td className="actions">
                        <button onClick={() => startEdit(item)} className="btn-edit">Edit</button>
                        <button onClick={() => onDelete(item.id)} className="btn-delete">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;

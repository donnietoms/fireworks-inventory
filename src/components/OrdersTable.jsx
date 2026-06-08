import { useState, useMemo } from 'react';
import './OrdersTable.css';

const OrdersTable = ({ orders, onUpdate, onDelete }) => {
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Filter and sort orders
  const displayedOrders = useMemo(() => {
    let filtered = orders;
    
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filtered = orders.filter(order =>
        order.vendor?.toLowerCase().includes(lowerFilter) ||
        order.orderNumber?.toLowerCase().includes(lowerFilter)
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
  }, [orders, filter, sortField, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    return displayedOrders.reduce((acc, order) => ({
      subtotal: acc.subtotal + (order.subtotal || 0),
      discount: acc.discount + (order.discount || 0),
      total: acc.total + (order.total || 0)
    }), { subtotal: 0, discount: 0, total: 0 });
  }, [displayedOrders]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startEdit = (order) => {
    setEditingId(order.id);
    setEditValues({
      vendor: order.vendor || '',
      orderNumber: order.orderNumber || '',
      subtotal: order.subtotal || 0,
      discount: order.discount || 0,
      total: order.total || 0
    });
  };

  const saveEdit = () => {
    onUpdate(editingId, {
      ...editValues,
      subtotal: parseFloat(editValues.subtotal) || 0,
      discount: parseFloat(editValues.discount) || 0,
      total: parseFloat(editValues.total) || 0
    });
    setEditingId(null);
    setEditValues({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon active">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="orders-table-container">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Search by vendor or order number..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="search-input"
        />
        <div className="table-stats">
          <span>{displayedOrders.length} orders</span>
          <span>Subtotal: ${totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span>Discount: ${totals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span>Total: ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('createdAt')}>
                Date <SortIcon field="createdAt" />
              </th>
              <th onClick={() => handleSort('vendor')}>
                Vendor <SortIcon field="vendor" />
              </th>
              <th onClick={() => handleSort('orderNumber')}>
                Order Number <SortIcon field="orderNumber" />
              </th>
              <th onClick={() => handleSort('subtotal')}>
                Subtotal <SortIcon field="subtotal" />
              </th>
              <th onClick={() => handleSort('discount')}>
                Discount <SortIcon field="discount" />
              </th>
              <th onClick={() => handleSort('total')}>
                Total <SortIcon field="total" />
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-message">
                  No orders recorded. Upload an invoice to create an order record.
                </td>
              </tr>
            ) : (
              displayedOrders.map(order => (
                <tr key={order.id}>
                  {editingId === order.id ? (
                    <>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <input
                          type="text"
                          value={editValues.vendor}
                          onChange={(e) => setEditValues(prev => ({ ...prev, vendor: e.target.value }))}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editValues.orderNumber}
                          onChange={(e) => setEditValues(prev => ({ ...prev, orderNumber: e.target.value }))}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editValues.subtotal}
                          onChange={(e) => setEditValues(prev => ({ ...prev, subtotal: e.target.value }))}
                          className="edit-input"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editValues.discount}
                          onChange={(e) => setEditValues(prev => ({ ...prev, discount: e.target.value }))}
                          className="edit-input"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editValues.total}
                          onChange={(e) => setEditValues(prev => ({ ...prev, total: e.target.value }))}
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
                      <td>{formatDate(order.createdAt)}</td>
                      <td>{order.vendor}</td>
                      <td>{order.orderNumber}</td>
                      <td className="amount">${order.subtotal.toFixed(2)}</td>
                      <td className="amount">${order.discount.toFixed(2)}</td>
                      <td className="amount total">${order.total.toFixed(2)}</td>
                      <td className="actions">
                        <button onClick={() => startEdit(order)} className="btn-edit">Edit</button>
                        <button onClick={() => onDelete(order.id, order.orderNumber)} className="btn-delete">Delete</button>
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

export default OrdersTable;

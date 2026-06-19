import { useState, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import './OrdersTable.css';

const OrdersTable = ({ orders, inventory = [], onUpdate, onDelete, onEdit, onViewInventory }) => {
  const [sortField, setSortField] = useState('orderDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filter, setFilter] = useState('');

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

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon">⇅</span>;
    return <span className="sort-icon active">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const handleViewInvoice = (order) => {
    if (order.invoiceFile) {
      // Open invoice in new window
      window.open(`${API_BASE_URL}/api/invoice/${order.invoiceFile}`, '_blank');
    } else {
      alert('No invoice file available for this order.');
    }
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
          <div className="stat-item">
            <span className="stat-label">Orders:</span>
            <span className="stat-value">{displayedOrders.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Subtotal:</span>
            <span className="stat-value">${totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Discount:</span>
            <span className="stat-value">${totals.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('orderDate')} style={{ cursor: 'pointer' }}>
                Order Date <SortIcon field="orderDate" />
              </th>
              <th onClick={() => handleSort('vendor')} style={{ cursor: 'pointer' }}>
                Vendor <SortIcon field="vendor" />
              </th>
              <th>
                Order Number
              </th>
              <th>
                Product Count
              </th>
              <th>
                Total Quantity
              </th>
              <th>
                Subtotal
              </th>
              <th>
                Discount
              </th>
              <th>
                Total
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-message">
                  No orders recorded. Upload an invoice to create an order record.
                </td>
              </tr>
            ) : (
              displayedOrders.map(order => {
                // Calculate product count and total quantity for this order
                const orderItems = inventory.filter(item => item.orderNumber === order.orderNumber);
                const productCount = orderItems.length;
                const totalQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
                
                // Debug: Log invoice file info
                if (order.orderNumber) {
                  console.log(`Order ${order.orderNumber}:`, {
                    invoiceFile: order.invoiceFile,
                    hasInvoiceFile: !!order.invoiceFile,
                    orderKeys: Object.keys(order)
                  });
                }
                
                return (
                  <tr key={order.id}>
                    <td>{formatDate(order.orderDate)}</td>
                    <td>{order.vendor}</td>
                    <td>{order.orderNumber}</td>
                    <td className="amount">{productCount}</td>
                    <td className="amount">{totalQuantity.toLocaleString()}</td>
                    <td className="amount">${order.subtotal.toFixed(2)}</td>
                    <td className="amount">${order.discount.toFixed(2)}</td>
                    <td className="amount total">${order.total.toFixed(2)}</td>
                    <td className="actions">
                      <button 
                        onClick={() => onViewInventory(order.orderNumber)} 
                        className="btn-inventory" 
                        title="View Order Inventory"
                      >
                        📦
                      </button>
                      {order.invoiceFile && (
                        <button onClick={() => handleViewInvoice(order)} className="btn-view" title="View Invoice">
                          📄
                        </button>
                      )}
                      <button onClick={() => onEdit(order)} className="btn-edit" title="Edit">✏️</button>
                      <button onClick={() => onDelete(order.id, order.orderNumber)} className="btn-delete" title="Delete">🗑️</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersTable;

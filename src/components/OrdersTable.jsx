import { useState, useMemo } from 'react';
import { API_BASE_URL } from '../config';
import { exportOrderToCSV, exportOrderToExcel } from '../utils/fileParser';
import './OrdersTable.css';

const OrdersTable = ({ orders, onUpdate, onDelete, onEdit, onViewInventory }) => {
  const [sortField, setSortField] = useState('createdAt');
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{order.vendor}</td>
                  <td>{order.orderNumber}</td>
                  <td className="amount">${order.subtotal.toFixed(2)}</td>
                  <td className="amount">${order.discount.toFixed(2)}</td>
                  <td className="amount total">${order.total.toFixed(2)}</td>
                  <td className="actions">
                    <button 
                      onClick={() => onViewInventory(order.orderNumber)} 
                      className="btn-inventory" 
                      title="View Inventory"
                    >
                      📦
                    </button>
                    {order.invoiceFile && (
                      <button onClick={() => handleViewInvoice(order)} className="btn-view" title="View Invoice">
                        📄
                      </button>
                    )}
                    <button 
                      onClick={() => exportOrderToCSV(order)} 
                      className="btn-export" 
                      title="Export to CSV"
                    >
                      📥 CSV
                    </button>
                    <button 
                      onClick={() => exportOrderToExcel(order)} 
                      className="btn-export" 
                      title="Export to Excel"
                    >
                      📥 XLS
                    </button>
                    <button onClick={() => onEdit(order)} className="btn-edit">Edit</button>
                    <button onClick={() => onDelete(order.id, order.orderNumber)} className="btn-delete">Delete</button>
                  </td>
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

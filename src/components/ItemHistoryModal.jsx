import React, { useMemo } from 'react';
import './ItemHistoryModal.css';

const ItemHistoryModal = ({ isOpen, onClose, partNumber, inventory, shows, orders }) => {
  if (!isOpen || !partNumber) return null;

  // Get all inventory items for this part number
  const itemOrders = useMemo(() => {
    return inventory
      .filter(item => item.partNumber === partNumber)
      .map(item => {
        // If vendor is missing from item, look it up from orders array
        if (!item.vendor && item.orderNumber && orders) {
          const order = orders.find(o => o.orderNumber === item.orderNumber);
          return {
            ...item,
            vendor: order?.vendor || 'Unknown'
          };
        }
        return item;
      })
      .sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
  }, [partNumber, inventory, orders]);

  // Get all shows that used this part number
  const showsUsing = useMemo(() => {
    const showsWithItem = shows
      .filter(show => show.items?.some(item => item.partNumber === partNumber))
      .map(show => ({
        ...show,
        itemsUsed: show.items.filter(item => item.partNumber === partNumber)
      }))
      .sort((a, b) => new Date(a.date || b.date) - new Date(b.date || a.date));
    
    return showsWithItem;
  }, [partNumber, shows]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalOrdered = itemOrders.reduce((sum, item) => sum + item.quantity, 0);
    const totalUsed = showsUsing.reduce((sum, show) => 
      sum + show.itemsUsed.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0), 
      0
    );
    const totalAvailable = totalOrdered - totalUsed;

    return {
      totalOrdered,
      totalUsed,
      totalAvailable,
      description: itemOrders[0]?.description || 'Unknown'
    };
  }, [itemOrders, showsUsing]);

  // Get order info from orders array
  const getOrderInfo = (orderNumber, orderDate) => {
    return orders.find(o => o.orderNumber === orderNumber && o.orderDate === orderDate);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (value) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content item-history-modal large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Item History: {partNumber}</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Summary section */}
          <div className="history-summary">
            <div className="summary-card">
              <div className="summary-label">Description</div>
              <div className="summary-value">{summary.description}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Ordered</div>
              <div className="summary-value">{summary.totalOrdered}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Used</div>
              <div className="summary-value">{summary.totalUsed}</div>
            </div>
            <div className="summary-card available">
              <div className="summary-label">Currently Available</div>
              <div className="summary-value">{summary.totalAvailable}</div>
            </div>
          </div>

          {/* Orders section */}
          <div className="history-section">
            <h3>📦 Orders ({itemOrders.length})</h3>
            {itemOrders.length === 0 ? (
              <p className="empty-message">No orders found for this item.</p>
            ) : (
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Vendor</th>
                      <th>Date</th>
                      <th>Quantity</th>
                      <th>Cost/Unit</th>
                      <th>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemOrders.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.orderNumber}</td>
                        <td>{item.vendor}</td>
                        <td>{formatDate(item.orderDate)}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.cost)}</td>
                        <td>{formatCurrency(item.lineTotal || (item.quantity * item.cost))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Shows section */}
          <div className="history-section">
            <h3>🎆 Shows Using This Item ({showsUsing.length})</h3>
            {showsUsing.length === 0 ? (
              <p className="empty-message">This item hasn't been used in any shows yet.</p>
            ) : (
              <div className="shows-list">
                {showsUsing.map((show, idx) => (
                   <div key={idx} className="show-card">
                     <div className="show-header">
                       <strong>{show.name || 'Unnamed Show'}</strong>
                       <span className="show-date">{formatDate(show.date)}</span>
                     </div>
                    <div className="show-details">
                      <div>Total Used: <strong>{show.itemsUsed.reduce((sum, i) => sum + (i.quantity || 0), 0)} items</strong></div>
                      {show.location && <div>Location: {show.location}</div>}
                      {show.notes && <div>Notes: {show.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline section */}
          <div className="history-section">
            <h3>📅 Activity Timeline</h3>
            <div className="timeline">
              {itemOrders.length === 0 && showsUsing.length === 0 ? (
                <p className="empty-message">No activity recorded.</p>
              ) : (
                <>
                  {itemOrders.map((order, idx) => (
                    <div key={`order-${idx}`} className="timeline-item order-item">
                      <div className="timeline-marker">📥</div>
                      <div className="timeline-content">
                        <strong>Ordered</strong>
                        <div>{order.quantity} items from {order.vendor}</div>
                        <div className="timeline-date">{formatDate(order.orderDate)}</div>
                      </div>
                    </div>
                  ))}
                  {showsUsing.map((show, idx) => (
                     <div key={`show-${idx}`} className="timeline-item show-item">
                       <div className="timeline-marker">📤</div>
                       <div className="timeline-content">
                         <strong>Used in {show.name || 'Show'}</strong>
                         <div>{show.itemsUsed.reduce((sum, i) => sum + (i.quantity || 0), 0)} items</div>
                         <div className="timeline-date">{formatDate(show.date)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-cancel">Close</button>
        </div>
      </div>
    </div>
  );
};

export default ItemHistoryModal;

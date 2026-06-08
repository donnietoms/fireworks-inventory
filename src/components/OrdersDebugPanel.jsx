import React, { useState } from 'react';
import { useOrders } from '../hooks/useOrders';

function OrdersDebugPanel() {
  const { orders, updateOrder } = useOrders();
  const [showPanel, setShowPanel] = useState(false);

  const checkOrderTotals = () => {
    console.log('=== Current Order Totals ===');
    orders.forEach(order => {
      console.log(`Order ${order.orderNumber}:`);
      console.log(`  Subtotal: $${order.subtotal.toFixed(2)}`);
      console.log(`  Discount: $${order.discount.toFixed(2)}`);
      console.log(`  Total: $${order.total.toFixed(2)}`);
    });
    console.log('\nExpected for Order #101628:');
    console.log('  Subtotal: $12,057.20');
    console.log('  Discount: $1,205.72');
    console.log('  Total: $10,851.48');
  };

  const fixOrder101628 = () => {
    const order = orders.find(o => o.orderNumber === '101628');
    if (order) {
      updateOrder(order.id, {
        subtotal: 12057.20,
        discount: 1205.72,
        total: 10851.48
      });
      alert('Order #101628 totals updated!');
    } else {
      alert('Order #101628 not found');
    }
  };

  if (!showPanel) {
    return (
      <button 
        onClick={() => setShowPanel(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '8px 12px',
          background: '#ff6b35',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 1000
        }}
      >
        🔧 Debug Orders
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '20px',
      background: 'white',
      border: '2px solid #ff6b35',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      zIndex: 1000,
      minWidth: '300px'
    }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Order Debug Panel</h3>
        <button 
          onClick={() => setShowPanel(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={checkOrderTotals}
          style={{
            padding: '8px 12px',
            background: '#e3f2fd',
            color: '#1976d2',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Order Totals (Console)
        </button>
        
        <button
          onClick={fixOrder101628}
          style={{
            padding: '8px 12px',
            background: '#e8f5e9',
            color: '#388e3c',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Fix Order #101628 Totals
        </button>
        
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginTop: '8px',
          padding: '8px',
          background: '#f5f5f5',
          borderRadius: '4px'
        }}>
          <strong>Note:</strong> Order totals should match the invoice PDF exactly. 
          If they were calculated from items, use the fix button to correct them.
        </div>
      </div>
    </div>
  );
}

export default OrdersDebugPanel;

// Script to update existing orders in localStorage with correct totals from invoices

const fs = require('fs');

// Instructions
console.log(`
To update your existing orders in the browser:

1. Open the browser console at http://localhost:5173
2. Copy and paste this code:

// Get existing orders
const orders = JSON.parse(localStorage.getItem('fireworks-orders') || '[]');

console.log('Current orders:', orders);

// The invoice parser already extracted correct totals
// They should already be correct, but if you uploaded before the fix
// and the totals show as calculated values, you may need to re-upload

// Check if any order has totals that don't match the invoice
orders.forEach(order => {
  console.log(\`Order \${order.orderNumber}: Subtotal=\$\${order.subtotal}, Discount=\$\${order.discount}, Total=\$\${order.total}\`);
});

// If the totals look wrong, you'll need to:
// 1. Delete the order (it will keep the inventory items)
// 2. Re-upload the invoice PDF (it will skip duplicate items but create the order with correct totals)

console.log('Done! Check the totals above. Order #101628 should be: Subtotal=$12,057.20, Discount=$1,205.72, Total=$10,851.48');
`);

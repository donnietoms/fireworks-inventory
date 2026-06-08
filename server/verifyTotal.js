import { parseWisleyPDF } from './pdfParser.js';

const items = await parseWisleyPDF('/Users/donnie_toms/Downloads/Sale 101628.pdf');

let total = 0;
items.forEach(item => {
  const itemTotal = item.quantity * item.cost;
  total += itemTotal;
});

console.log('My calculated total:', total.toFixed(2));
console.log('Invoice subtotal: $12,057.20');
console.log('Difference:', (total - 12057.20).toFixed(2));

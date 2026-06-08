import { parseWisleyPDF } from './pdfParser.js';

const items = await parseWisleyPDF('/Users/donnie_toms/Downloads/Sale 101628.pdf');

console.log('All parsed items:\n');
let totalValue = 0;
items.forEach(item => {
  const itemTotal = item.quantity * item.cost;
  totalValue += itemTotal;
  console.log(`${item.partNumber.padEnd(15)} | Qty: ${String(item.quantity).padStart(3)} | Cost: $${item.cost.toFixed(2).padStart(7)} | Total: $${itemTotal.toFixed(2).padStart(8)}`);
});

console.log(`\n${'='.repeat(80)}`);
console.log(`Total calculated value: $${totalValue.toFixed(2)}`);
console.log(`Invoice subtotal:       $12,057.20`);
console.log(`Difference:             $${(12057.20 - totalValue).toFixed(2)}`);

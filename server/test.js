import { parseWisleyPDF } from './pdfParser.js';

const items = await parseWisleyPDF('/Users/donnie_toms/Downloads/Sale 101628.pdf');

console.log('Total items parsed:', items.length);
console.log('\nFirst 10 items:');
items.slice(0, 10).forEach(item => {
  console.log(`${item.partNumber.padEnd(15)} | ${item.description.substring(0, 40).padEnd(40)} | Qty: ${String(item.quantity).padStart(3)} | Cost: $${item.cost}`);
});

console.log('\nLast 5 items:');
items.slice(-5).forEach(item => {
  console.log(`${item.partNumber.padEnd(15)} | ${item.description.substring(0, 40).padEnd(40)} | Qty: ${String(item.quantity).padStart(3)} | Cost: $${item.cost}`);
});

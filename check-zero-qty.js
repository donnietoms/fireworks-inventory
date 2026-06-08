import { parseShootListPDF } from './server/parsers/shootListParser.js';

const result = await parseShootListPDF('/Volumes/Pyro External Drive/Bogue 2026/Dedication Show/Bogue 2026 Dedication/Report - Product Totals.pdf');

console.log('Items with quantity 0 or missing:');
result.items.filter(i => !i.quantity || i.quantity === 0).forEach(i => {
  console.log(`  ${i.partNumber}: qty=${i.quantity}, desc="${i.description}"`);
});

console.log('\nTotal items with 0 quantity:', result.items.filter(i => !i.quantity || i.quantity === 0).length);
console.log('Total items:', result.items.length);

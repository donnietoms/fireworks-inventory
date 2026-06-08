import { parseShootListPDF } from './server/parsers/shootListParser.js';

const result = await parseShootListPDF('/Volumes/Pyro External Drive/Bogue 2026/Dedication Show/Bogue 2026 Dedication/Report - Product Totals.pdf');

console.log('Previously problematic items:');
const items = result.items.filter(i => 
  i.partNumber === 'PFX13FR-15-SW-01' || 
  i.partNumber === 'PFX50MNC-RBWS'
);

items.forEach(i => {
  console.log(`\n${i.partNumber}:`);
  console.log(`  Description: ${i.description}`);
  console.log(`  Quantity: ${i.quantity}`);
});

import { parseShootListPDF } from './server/parsers/shootListParser.js';

const result = await parseShootListPDF('/Volumes/Pyro External Drive/Bogue 2026/Dedication Show/Bogue 2026 Dedication/Report - Product Totals.pdf');
console.log('Show Info:', JSON.stringify(result.showInfo, null, 2));
console.log('Total Items:', result.items.length);
console.log('First 5 Items:', JSON.stringify(result.items.slice(0, 5), null, 2));
console.log('Last 5 Items:', JSON.stringify(result.items.slice(-5), null, 2));

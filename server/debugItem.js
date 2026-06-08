import { parseWisleyPDF } from './pdfParser.js';

const items = await parseWisleyPDF('/Users/donnie_toms/Downloads/Sale 101628.pdf');
const item = items.find(i => i.partNumber === 'WPI-5-GTW');

console.log('WPI-5-GTW:', item);
console.log('Total:', item.quantity * item.cost);

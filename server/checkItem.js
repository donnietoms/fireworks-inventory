import { parseWisleyPDF } from './parsers/wisleyPdfParser.js';

const result = await parseWisleyPDF('/Users/donnie_toms/Downloads/Sale 101628.pdf');
const item = result.items.find(i => i.partNumber === 'FK-ASST-69C');

console.log('FK-ASST-69C item:');
console.log(JSON.stringify(item, null, 2));
console.log('\nDescription length:', item.description.length);

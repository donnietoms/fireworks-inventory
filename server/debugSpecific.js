import { parseWisleyPDF } from './parsers/wisleyPdfParser.js';

const pdfPath = process.argv[2] || '/Users/donnie_toms/Downloads/Sale 101628.pdf';

const result = await parseWisleyPDF(pdfPath);

const itemsToCheck = ['FK-5-BSW', 'FK-5-CWC', 'WPI-ASST-5B', 'PD-ASST-4A'];

console.log('Checking specific items:\n');

itemsToCheck.forEach(partNum => {
  const item = result.items.find(i => i.partNumber === partNum);
  if (item) {
    console.log(`${partNum}:`);
    console.log(`  Description: ${item.description.substring(0, 100)}...`);
    console.log(`  Quantity (cases): ${item.quantity}`);
    console.log(`  Cost per shell: $${item.cost.toFixed(2)}`);
    console.log('');
  } else {
    console.log(`${partNum}: NOT FOUND`);
    console.log('');
  }
});

console.log('\n=== All items with "BSW" ===\n');
result.items.filter(i => i.partNumber.includes('BSW')).forEach(item => {
  console.log(`${item.partNumber}: Qty=${item.quantity}, Cost=$${item.cost.toFixed(2)}`);
  console.log(`  Desc: ${item.description.substring(0, 80)}`);
});

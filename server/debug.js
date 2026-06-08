import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync('pdftotext', ['-layout', '/Users/donnie_toms/Downloads/Sale 101628.pdf', '-']);

const lines = stdout.split('\n');

// Just test L-FK-4-CWC line
const line = lines.find(l => l.includes('L-FK-4-CWC'));
console.log('Raw line:', line);
console.log('');

// Extract same way as parser
const partNumber = 'L-FK-4-CWC';
const partNumEndPos = line.indexOf(partNumber) + partNumber.length;
let descriptionSection = line.substring(partNumEndPos, 92).trim();
console.log('Description section:', descriptionSection);

const packingMatch = descriptionSection.match(/\b(\d+)\/(\d+)\b/);
console.log('Packing match:', packingMatch);

let itemsPerCase = 1;
let casesPerUnit = 1;
if (packingMatch) {
  itemsPerCase = parseInt(packingMatch[1]);
  casesPerUnit = parseInt(packingMatch[2]);
}
console.log('itemsPerCase:', itemsPerCase, 'casesPerUnit:', casesPerUnit);

const quantitySection = line.substring(90, 107).trim();
console.log('Quantity section:', quantitySection);

const qtyMatch = quantitySection.match(/^\d+/);
const casesOrdered = qtyMatch ? parseInt(qtyMatch[0]) : 1;
console.log('casesOrdered:', casesOrdered);

const priceSection = line.substring(105).trim();
console.log('Price section:', priceSection);

const priceNumbers = priceSection.match(/\d+\.?\d*/g) || [];
const prices = priceNumbers.map(n => parseFloat(n));
console.log('Prices:', prices);

const unitPrice = prices[0];
const subtotal = prices[1];
console.log('unitPrice:', unitPrice, 'subtotal:', subtotal);

const calculatedSubtotal = casesOrdered * unitPrice;
console.log('calculatedSubtotal:', calculatedSubtotal);
console.log('Match?', Math.abs(calculatedSubtotal - subtotal) < 0.5);

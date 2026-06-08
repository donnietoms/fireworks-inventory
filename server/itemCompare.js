import { execFile } from 'child_process';
import { promisify } from 'util';
import { parseWisleyPDF } from './pdfParser.js';

const execFileAsync = promisify(execFile);

// Get PDF lines with subtotals
const { stdout } = await execFileAsync('pdftotext', ['-layout', '/Users/donnie_toms/Downloads/Sale 101628.pdf', '-']);
const pdfMap = new Map();

stdout.split('\n').forEach(line => {
  const match = line.match(/^([A-Z0-9][-A-Z0-9_]+)/i);
  if (match && line.match(/\d+\.\d+\s*$/)) {
    const partNum = match[1];
    const parts = line.trim().split(/\s+/);
    const subtotal = parseFloat(parts[parts.length - 1]);
    if (!pdfMap.has(partNum)) {
      pdfMap.set(partNum, subtotal);
    }
  }
});

// Get my parsed items
const items = await parseWisleyPDF('/Users/donnie_toms/Downloads/Sale 101628.pdf');

console.log('Part Number'.padEnd(20), 'PDF $'.padStart(10), 'Mine $'.padStart(10), 'Diff'.padStart(10));
console.log('='.repeat(55));

let totalDiff = 0;
items.forEach(item => {
  const myTotal = item.quantity * item.cost;
  const pdfTotal = pdfMap.get(item.partNumber) || 0;
  const diff = myTotal - pdfTotal;
  totalDiff += diff;
  
  if (Math.abs(diff) > 1) {  // Only show significant differences
    console.log(
      item.partNumber.padEnd(20),
      pdfTotal.toFixed(2).padStart(10),
      myTotal.toFixed(2).padStart(10),
      diff.toFixed(2).padStart(10)
    );
  }
});

console.log('='.repeat(55));
console.log('Total difference:'.padEnd(20), '', '', totalDiff.toFixed(2).padStart(10));

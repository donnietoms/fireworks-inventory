import { execFile } from 'child_process';
import { promisify } from 'util';
import { parseWisleyPDF } from './pdfParser.js';

const execFileAsync = promisify(execFile);

// Get PDF lines
const { stdout } = await execFileAsync('pdftotext', ['-layout', '/Users/donnie_toms/Downloads/Sale 101628.pdf', '-']);
const pdfLines = stdout.split('\n')
  .filter(line => line.match(/^\S.*\d+\.\d+\s*$/))
  .map(line => {
    const parts = line.trim().split(/\s+/);
    const subtotal = parseFloat(parts[parts.length - 1]);
    const partNum = parts[0];
    return { partNum, subtotal, line: line.substring(0, 80) };
  });

// Get my parsed items
const items = await parseWisleyPDF('/Users/donnie_toms/Downloads/Sale 101628.pdf');

console.log('PDF Items:', pdfLines.length);
console.log('Parsed Items:', items.length);
console.log('');

// Sum PDF subtotals
const pdfTotal = pdfLines.reduce((sum, item) => sum + item.subtotal, 0);
console.log('PDF subtotals sum:', pdfTotal.toFixed(2));

// Sum my calculated totals
const myTotal = items.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
console.log('My totals sum:', myTotal.toFixed(2));
console.log('Difference:', (myTotal - pdfTotal).toFixed(2));

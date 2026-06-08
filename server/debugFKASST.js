import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const pdfPath = '/Users/donnie_toms/Downloads/Sale 101628.pdf';

// Run pdftotext
const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
const lines = stdout.split('\n');

// Find FK-ASST-69C
const lineIdx = lines.findIndex(l => l.includes('FK-ASST-69C'));
console.log(`Found at line ${lineIdx}:`);
console.log(`"${lines[lineIdx]}"`);

// Build full line with continuations
let fullLine = lines[lineIdx];
let i = lineIdx + 1;
while (i < lines.length) {
  const nextLine = lines[i];
  const hasManySpaces = nextLine.match(/^\s{10,}/);
  const startsWithPartNum = nextLine.match(/^[A-Z0-9][-A-Z0-9_]+/i);
  
  if (hasManySpaces && !startsWithPartNum) {
    const continuation = nextLine.trim();
    console.log(`  + continuation (${nextLine.match(/^(\s*)/)[1].length} spaces): "${continuation}"`);
    if (continuation) {
      fullLine += ' ' + continuation;
    }
    i++;
  } else {
    break;
  }
}

console.log(`\nFull line:`);
console.log(`"${fullLine}"`);

// Now parse it
const trimmed = fullLine.trim();
const partNumberMatch = trimmed.match(/^([A-Z0-9][-A-Z0-9_]+)/i);
console.log(`\nPart number: ${partNumberMatch[1]}`);

const afterPartNum = fullLine.substring(fullLine.indexOf(partNumberMatch[1]) + partNumberMatch[1].length);
console.log(`\nAfter part number:`);
console.log(`"${afterPartNum}"`);

// Extract packing
const packingMatch = afterPartNum.match(/(\d+)\/(\d+)/);
if (packingMatch) {
  console.log(`\nPacking found: ${packingMatch[0]} (${packingMatch[1]} items per case x ${packingMatch[2]} cases per unit)`);
} else {
  console.log(`\nNo packing found!`);
}

// Remove packing
let afterPartNumNoPacking = afterPartNum;
if (packingMatch) {
  afterPartNumNoPacking = afterPartNum.replace(/\d+\/\d+/, '');
}

console.log(`\nAfter removing packing:`);
console.log(`"${afterPartNumNoPacking}"`);

// Extract numbers
const allNumbers = afterPartNumNoPacking.match(/\d+(?:\.\d+)?/g);
console.log(`\nNumbers found: ${allNumbers?.join(', ')}`);

const dataNumbers = allNumbers?.map(n => parseFloat(n));
console.log(`Data numbers: ${dataNumbers?.join(', ')}`);

if (dataNumbers && dataNumbers.length >= 2) {
  let casesOrdered, pricePerCase;
  
  if (dataNumbers.length === 2) {
    [casesOrdered, pricePerCase] = dataNumbers;
  } else {
    casesOrdered = Math.floor(dataNumbers[dataNumbers.length - 3]);
    pricePerCase = dataNumbers[dataNumbers.length - 2];
  }
  
  console.log(`\nExtracted:`);
  console.log(`  Cases ordered: ${casesOrdered}`);
  console.log(`  Price per case: $${pricePerCase}`);
}

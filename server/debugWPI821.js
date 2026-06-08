import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const { stdout } = await execFileAsync('pdftotext', ['-layout', '/Users/donnie_toms/Downloads/Sale 101628.pdf', '-']);
const lines = stdout.split('\n');

const idx = lines.findIndex(l => l.includes('WPI-8-21'));
console.log('Main line:', lines[idx]);

// Build full line
let fullLine = lines[idx];
let i = idx + 1;
while (i < lines.length) {
  const nextLine = lines[i];
  const hasManySpaces = nextLine.match(/^\s{10,}/);
  const startsWithPartNum = nextLine.match(/^[A-Z0-9][-A-Z0-9_]+/i);
  
  if (hasManySpaces && !startsWithPartNum) {
    console.log(`Continuation: "${nextLine}"`);
    fullLine += ' ' + nextLine.trim();
    i++;
  } else {
    break;
  }
}

console.log('\nFull line:', fullLine);

// Extract packing
const packingMatch = fullLine.match(/(\d+)\/(\d+)/);
console.log('\nPacking match:', packingMatch);

// Remove packing
let noPacking = fullLine;
if (packingMatch) {
  noPacking = fullLine.replace(/\d+\/\d+/, '');
}

console.log('\nAfter removing packing:', noPacking);

// Get numbers
const allNumbers = noPacking.match(/\d+(?:\.\d+)?/g);
console.log('\nAll numbers:', allNumbers);

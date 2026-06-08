import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync('pdftotext', ['-layout', '/Users/donnie_toms/Downloads/Sale 101628.pdf', '-']);

const lines = stdout.split('\n');

console.log('Looking for Total line...\n');

lines.forEach((line, idx) => {
  if (line.includes('Total:') || line.includes('Subtotal:') || line.includes('Discount:')) {
    console.log(`Line ${idx}:`, JSON.stringify(line));
    console.log('  Contains Subtotal?', line.includes('Subtotal:'));
    console.log('  Contains Total?', line.includes('Total:'));
    console.log('  Match test:', line.match(/Total:\s*([\d,]+\.?\d*)\s*$/i));
  }
});

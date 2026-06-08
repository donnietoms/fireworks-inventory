import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const { stdout } = await execFileAsync('pdftotext', ['-layout', '/Users/donnie_toms/Downloads/Sale 101628.pdf', '-']);
const lines = stdout.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('Discount:') || (line.includes('Total:') && !line.includes('Subtotal:'))) {
    console.log(`Line ${idx}: "${line}"`);
    console.log(`  Test 1: /Discount:\\s*-?\\s*([\\d,]+\\.?\\d*)\\s*$/i => ${line.match(/Discount:\s*-?\s*([\d,]+\.?\d*)\s*$/i)}`);
    console.log(`  Test 2: /Total:\\s*([\\d,]+\\.?\\d*)\\s*$/i => ${line.match(/Total:\s*([\d,]+\.?\d*)\s*$/i)}`);
    console.log('');
  }
});

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const { stdout } = await execFileAsync('pdftotext', ['-layout', '/Users/donnie_toms/Downloads/Sale 101628.pdf', '-']);

const lines = stdout.split('\n');

// Find FK-ASST-69C
const idx = lines.findIndex(l => l.includes('FK-ASST-69C'));
console.log('FK-ASST-69C at line:', idx);
console.log('Line:', JSON.stringify(lines[idx]));
console.log('Next line:', JSON.stringify(lines[idx + 1]));
console.log('Next+1 line:', JSON.stringify(lines[idx + 2]));

const nextLine = lines[idx + 1];
console.log('\nTesting continuation regex:');
console.log('Has 10+ spaces?', nextLine.match(/^\s{10,}/));
console.log('Has part number?', nextLine.match(/^\s*[A-Z0-9][-A-Z0-9_]+/i));
console.log('Trimmed:', JSON.stringify(nextLine.trim()));

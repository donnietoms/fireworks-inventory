import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const pdfPath = process.argv[2] || '/Users/donnie_toms/Downloads/Sale 101628.pdf';

// Run pdftotext
const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
const lines = stdout.split('\n');

// Find FK-5-BSW line
const targetItems = ['FK-5-BSW', 'FK-5-CWC', 'WPI-ASST-5B', 'PD-ASST-4A'];

targetItems.forEach(target => {
  const lineIndex = lines.findIndex(l => l.trim().startsWith(target));
  if (lineIndex >= 0) {
    console.log(`\n=== ${target} ===`);
    console.log(`Line ${lineIndex}:`);
    console.log(`"${lines[lineIndex]}"`);
    
    // Check next few lines for continuation
    for (let j = 1; j <= 5; j++) {
      if (lines[lineIndex + j]) {
        const nextLine = lines[lineIndex + j];
        const leadingSpaces = nextLine.match(/^(\s*)/)[1].length;
        console.log(`Line ${lineIndex + j} (${leadingSpaces} spaces): "${nextLine}"`);
      }
    }
  }
});

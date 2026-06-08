import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Parse shoot list PDF (Product Totals format)
 * Format: Size | Part Number | Description | Quantity | Price | Cost | Weight | NEQ
 */
export async function parseShootListPDF(pdfPath) {
  try {
    // Run pdftotext with -layout flag
    const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
    
    const lines = stdout.split('\n');
    const items = [];
    let showInfo = {
      name: null,
      date: null,
      location: null
    };
    
    let inDataSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Extract show name (first line, usually ends with .fin)
      if (i === 0 && line.trim()) {
        showInfo.name = line.trim().replace(/\s+\d+\/\d+$/, ''); // Remove page numbers
      }
      
      // Look for "Show date" and "Location" labels
      if (line.match(/Show date/i)) {
        // Next non-empty line might have the date
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && lines[j].trim() && !lines[j].includes('Location')) {
          showInfo.date = lines[j].trim();
        }
      }
      
      if (line.match(/Location/i)) {
        // Next non-empty line might have the location
        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        if (j < lines.length && lines[j].trim() && !lines[j].includes('Product Totals')) {
          showInfo.location = lines[j].trim();
        }
      }
      
      // Look for the header row
      if (line.includes('Size') && line.includes('Part Number') && line.includes('Description')) {
        inDataSection = true;
        continue;
      }
      
      // Skip non-data lines
      if (!inDataSection) continue;
      
      // Skip page headers (repeated headers)
      if (line.includes('Product Totals') || line.includes('Show date')) {
        inDataSection = false;
        continue;
      }
      
      // Try to parse as product line
      const item = parseShootListLine(line);
      if (item) {
        // Check for continuation lines (description overflow)
        let nextLineIdx = i + 1;
        while (nextLineIdx < lines.length) {
          const nextLine = lines[nextLineIdx];
          const hasManySpaces = nextLine.match(/^\s{10,}/);
          const startsWithPartNum = nextLine.match(/^[A-Z0-9][-A-Z0-9_]+/i);
          const isHeader = nextLine.includes('Product Totals') || nextLine.includes('Show date');
          
          if (hasManySpaces && !startsWithPartNum && !isHeader) {
            const continuation = nextLine.trim();
            if (continuation) {
              item.description += ' ' + continuation;
            }
            i = nextLineIdx;
            nextLineIdx++;
          } else {
            break;
          }
        }
        
        items.push(item);
      }
    }
    
    return { items, showInfo };
  } catch (error) {
    throw new Error(`Failed to parse shoot list PDF: ${error.message}`);
  }
}

/**
 * Parse a single line from the shoot list
 * Format: Size | Part Number | Description | Quantity | Price | Cost | Weight | NEQ
 * The columns are roughly at these positions based on the header alignment
 */
function parseShootListLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 20) {
    return null;
  }
  
  // Skip lines that start with lots of spaces (continuation lines)
  if (line.match(/^\s{10,}/)) {
    return null;
  }
  
  // Extract columns using regex
  // Size is at the start (e.g., "3\"", "4\"", "50mm", "1.2\"")
  const sizeMatch = trimmed.match(/^([\d.]+["']?|[\d]+mm)\s+/);
  if (!sizeMatch) {
    return null;
  }
  
  const size = sizeMatch[1];
  let afterSize = line.substring(line.indexOf(size) + size.length).trim();
  
  // Part number is next (alphanumeric with dashes/underscores)
  const partNumberMatch = afterSize.match(/^([A-Z0-9][-A-Z0-9_]+)/i);
  if (!partNumberMatch) {
    return null;
  }
  
  const partNumber = partNumberMatch[1];
  let afterPartNum = afterSize.substring(afterSize.indexOf(partNumber) + partNumber.length);
  
  // The numeric columns start around column 85-90 in the original line
  // Try to split by significant whitespace to find the data columns
  const parts = afterPartNum.split(/\s{2,}/).filter(p => p); // Split by 2+ spaces and remove empty
  
  // parts[0] might contain description + quantity if they're separated by only 1 space
  // Look for pattern: description text ending with a number separated by spaces from price
  let description = parts[0]?.trim() || '';
  let quantity = 1; // Default to 1 if no quantity found
  
  // Check if description ends with a standalone number (likely the quantity)
  // Pattern: text followed by spaces and a number at the end
  const descWithQtyMatch = description.match(/^(.+?)\s+(\d+)$/);
  if (descWithQtyMatch) {
    // The number at the end is likely the quantity
    description = descWithQtyMatch[1].trim();
    quantity = parseInt(descWithQtyMatch[2]);
  } else if (parts.length > 1) {
    // Look for numeric values in subsequent parts (after description)
    for (let i = 1; i < parts.length; i++) {
      const val = parts[i].trim();
      if (val && /^\d+$/.test(val)) {
        quantity = parseInt(val);
        break;
      }
    }
  }
  
  return {
    size,
    partNumber,
    description,
    quantity
  };
}

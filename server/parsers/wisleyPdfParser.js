import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Parse Wisley PDF using pdftotext
export async function parseWisleyPDF(pdfPath) {
  try {
    // Run pdftotext with -layout flag to preserve column alignment
    const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
    
    const lines = stdout.split('\n');
    const items = [];
    let orderInfo = {
      orderNumber: null,
      subtotal: 0,
      total: 0,
      discount: 0
    };
    
    let inDataSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Extract order number
      const orderMatch = line.match(/ORDER NUMBER:\s*(\S+)/i) || line.match(/SALE NUMBER:\s*(\S+)/i);
      if (orderMatch) {
        orderInfo.orderNumber = orderMatch[1];
      }
      
      // Extract subtotal (must be at end of line with colon)
      if (line.match(/Subtotal:\s*([\d,]+\.?\d*)\s*$/i)) {
        const subtotalMatch = line.match(/Subtotal:\s*([\d,]+\.?\d*)\s*$/i);
        orderInfo.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
      }
      
      // Extract discount (can be on separate line)
      if (line.match(/Discount:\s*-?\s*([\d,]+\.?\d*)\s*$/i)) {
        const discountMatch = line.match(/Discount:\s*-?\s*([\d,]+\.?\d*)\s*$/i);
        orderInfo.discount = parseFloat(discountMatch[1].replace(/,/g, ''));
      }
      
      // Extract total (must say "Total:" not "Subtotal:")
      if (line.includes('Total:') && !line.includes('Subtotal:')) {
        const totalMatch = line.match(/Total:\s*([\d,]+\.?\d*)\s*$/i);
        if (totalMatch) {
          orderInfo.total = parseFloat(totalMatch[1].replace(/,/g, ''));
        }
      }
      
      // Look for the header row
      if (line.includes('Product ID') && line.includes('Description')) {
        inDataSection = true;
        continue;
      }
      
      // Skip non-data lines
      if (!inDataSection) continue;
      
      // Try to parse as product line (will return null for non-product lines)
      const item = parseWisleyLine(line);
      if (item) {
        // Check if next lines are continuation (start with lots of whitespace)
        let nextLineIdx = i + 1;
        while (nextLineIdx < lines.length) {
          const nextLine = lines[nextLineIdx];
          // Continuation lines have significant leading whitespace (10+) 
          // and don't start with a part number at the beginning
          const hasManySpaces = nextLine.match(/^\s{10,}/);
          const startsWithPartNum = nextLine.match(/^[A-Z0-9][-A-Z0-9_]+/i);
          
          if (hasManySpaces && !startsWithPartNum) {
            const continuation = nextLine.trim();
            if (continuation) {
              item.description += ' ' + continuation;
            }
            nextLineIdx++;
          } else {
            break;
          }
        }
        items.push(item);
      }
    }
    
    // If discount wasn't explicitly found, calculate it from subtotal and total
    if (orderInfo.discount === 0 && orderInfo.subtotal > 0 && orderInfo.total > 0) {
      orderInfo.discount = orderInfo.subtotal - orderInfo.total;
    }
    
    return { items, orderInfo };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

function parseWisleyLine(line) {
  // Skip empty or non-product lines
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 20) {
    return null;
  }
  
  // Skip continuation lines (they start with significant whitespace)
  if (line.match(/^\s{10,}/)) {
    return null;
  }
  
  // Extract product ID from the beginning
  const partNumberMatch = trimmed.match(/^([A-Z0-9][-A-Z0-9_]+)/i);
  if (!partNumberMatch) {
    return null;
  }
  
  const partNumber = partNumberMatch[1].trim();
  
  // Get everything after the part number
  const afterPartNum = line.substring(line.indexOf(partNumber) + partNumber.length);
  
  // Extract packing from the line (X/Y format) and remove it
  const packingMatch = afterPartNum.match(/(\d+)\/(\d+)/);
  let itemsPerCase = 1;
  let casesPerUnit = 1;
  let afterPartNumNoPacking = afterPartNum;
  
  if (packingMatch) {
    itemsPerCase = parseInt(packingMatch[1]);
    casesPerUnit = parseInt(packingMatch[2]);
    // Remove the packing pattern from the string before extracting numbers
    afterPartNumNoPacking = afterPartNum.replace(/\d+\/\d+/, '');
  }
  
  // Extract all numbers (including decimals) from the rest of the line (after removing packing)
  const allNumbers = afterPartNumNoPacking.match(/\d+(?:\.\d+)?/g);
  if (!allNumbers || allNumbers.length < 2) {
    return null; // Need at least quantity and price
  }
  
  const dataNumbers = allNumbers.map(n => parseFloat(n));
  
  if (dataNumbers.length < 2) {
    return null;
  }
  
  // The last 2-3 numbers should be: quantity, unit_price, subtotal
  // If length is 2, it's: quantity, price
  // If length is 3+, it's likely: ..., quantity, unit_price, subtotal
  
  let casesOrdered, pricePerCase;
  
  if (dataNumbers.length === 2) {
    // Exactly 2 numbers: quantity and price
    [casesOrdered, pricePerCase] = dataNumbers;
  } else {
    // 3+ numbers: take last 3 as qty, unit_price, subtotal
    casesOrdered = Math.floor(dataNumbers[dataNumbers.length - 3]);
    pricePerCase = dataNumbers[dataNumbers.length - 2];
  }
  
  // Extract description - everything before the numbers, minus the packing
  let description = afterPartNum;
  // Remove packing notation
  if (packingMatch) {
    description = description.replace(/\s*-?\s*\d+\/\d+/, '');
  }
  // Remove all trailing numbers (quantity, prices)
  description = description.replace(/[\d\s.]+$/, '').trim();
  // Remove trailing dash if present
  description = description.replace(/\s*-\s*$/, '').trim();
  
  // Calculate totals
  const totalPacking = itemsPerCase * casesPerUnit;
  const totalQuantity = casesOrdered * totalPacking;
  const costPerItem = totalPacking > 0 ? pricePerCase / totalPacking : pricePerCase;
  
  return {
    partNumber,
    description,
    quantity: totalQuantity,
    cost: parseFloat(costPerItem.toFixed(2))
  };
}

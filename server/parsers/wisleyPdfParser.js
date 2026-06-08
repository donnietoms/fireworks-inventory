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
      
      // Extract order number (anywhere in document)
      const orderMatch = line.match(/ORDER NUMBER:\s*(\S+)/i) || line.match(/SALE NUMBER:\s*(\S+)/i);
      if (orderMatch) {
        orderInfo.orderNumber = orderMatch[1];
      }
      
      // Extract subtotal (anywhere in document)
      if (line.match(/Subtotal:\s*([\d,]+\.?\d*)\s*$/i)) {
        const subtotalMatch = line.match(/Subtotal:\s*([\d,]+\.?\d*)\s*$/i);
        orderInfo.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
      }
      
      // Extract discount (anywhere in document)
      if (line.match(/Discount:\s*-?\s*([\d,]+\.?\d*)\s*$/i)) {
        const discountMatch = line.match(/Discount:\s*-?\s*([\d,]+\.?\d*)\s*$/i);
        orderInfo.discount = parseFloat(discountMatch[1].replace(/,/g, ''));
      }
      
      // Extract total (anywhere in document)
      if (line.includes('Total:') && !line.includes('Subtotal:')) {
        const totalMatch = line.match(/Total:\s*([\d,]+\.?\d*)\s*$/i);
        if (totalMatch) {
          orderInfo.total = parseFloat(totalMatch[1].replace(/,/g, ''));
        }
      }
      
      // Look for the header row to start data section
      if (line.includes('Product ID') && line.includes('Description')) {
        inDataSection = true;
        continue;
      }
      
      // Skip non-data lines (continue to next line for order info extraction)
      if (!inDataSection) continue;
      
      // Try to parse as product line (will return null for non-product lines)
      let originalLine = line;  // Keep the original line for extracting qty/price
      let fullLine = line;
      
      // Check if next lines are continuation (start with lots of whitespace)
      let nextLineIdx = i + 1;
      while (nextLineIdx < lines.length) {
        const nextLine = lines[nextLineIdx];
        // Continuation lines have significant leading whitespace (10+) 
        // and don't start with a part number at the beginning
        // BUT stop if we hit order summary lines (Subtotal, Discount, Total)
        const hasManySpaces = nextLine.match(/^\s{10,}/);
        const startsWithPartNum = nextLine.match(/^[A-Z0-9][-A-Z0-9_]+/i);
        const isOrderSummary = nextLine.match(/Subtotal:|Discount:|Total:/i);
        
        if (hasManySpaces && !startsWithPartNum && !isOrderSummary) {
          const continuation = nextLine.trim();
          if (continuation) {
            fullLine += ' ' + continuation;
          }
          i = nextLineIdx; // Skip this line in the outer loop
          nextLineIdx++;
        } else {
          break;
        }
      }
      
      const item = parseWisleyLine(originalLine, fullLine);
      if (item) {
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

function parseWisleyLine(originalLine, fullLine = null) {
  // Use fullLine for packing/description, originalLine for qty/price
  const lineForParsing = fullLine || originalLine;
  
  // Skip empty or non-product lines
  const trimmed = lineForParsing.trim();
  if (!trimmed || trimmed.length < 20) {
    return null;
  }
  
  // Skip continuation lines (they start with significant whitespace)
  if (originalLine.match(/^\s{10,}/)) {
    return null;
  }
  
  // Extract product ID from the beginning
  const partNumberMatch = trimmed.match(/^([A-Z0-9][-A-Z0-9_]+)/i);
  if (!partNumberMatch) {
    return null;
  }
  
  const partNumber = partNumberMatch[1].trim();
  
  // Get everything after the part number FROM THE FULL LINE (for packing)
  const afterPartNumFull = lineForParsing.substring(lineForParsing.indexOf(partNumber) + partNumber.length);
  
  // Get everything after the part number FROM THE ORIGINAL LINE (for qty/price)
  const afterPartNumOriginal = originalLine.substring(originalLine.indexOf(partNumber) + partNumber.length);
  
  // Extract packing from the FULL line (may be in continuation)
  const packingMatch = afterPartNumFull.match(/(\d+)\/(\d+)/);
  let itemsPerCase = 1;
  let casesPerUnit = 1;
  
  if (packingMatch) {
    itemsPerCase = parseInt(packingMatch[1]);
    casesPerUnit = parseInt(packingMatch[2]);
  }
  
  // Extract numbers from ORIGINAL line only (not continuation) for qty/price
  let afterPartNumNoPacking = afterPartNumOriginal;
  if (packingMatch && afterPartNumOriginal.includes(packingMatch[0])) {
    // Only remove packing if it's in the original line
    afterPartNumNoPacking = afterPartNumOriginal.replace(/\d+\/\d+/, '');
  }
  
  // Extract all numbers from ORIGINAL LINE
  const allNumbers = afterPartNumNoPacking.match(/\d+(?:\.\d+)?/g);
  if (!allNumbers || allNumbers.length < 2) {
    return null; // Need at least quantity and price
  }
  
  const dataNumbers = allNumbers.map(n => parseFloat(n));
  
  if (dataNumbers.length < 2) {
    return null;
  }
  
  // The last 2-3 numbers should be: quantity, unit_price, subtotal
  let casesOrdered, pricePerCase;
  
  if (dataNumbers.length === 2) {
    // Exactly 2 numbers: quantity and price
    [casesOrdered, pricePerCase] = dataNumbers;
  } else {
    // 3+ numbers: take last 3 as qty, unit_price, subtotal
    casesOrdered = Math.floor(dataNumbers[dataNumbers.length - 3]);
    pricePerCase = dataNumbers[dataNumbers.length - 2];
  }
  
  // Extract description from FULL LINE
  let description = afterPartNumFull;
  
  // Remove packing notation
  if (packingMatch) {
    description = description.replace(/\s*-?\s*\d+\/\d+/, '');
  }
  
  // Try to find the start of the quantity/price section
  const priceDataPattern = /\s+(\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)(?=\s|$)/;
  const priceMatch = description.match(priceDataPattern);
  
  if (priceMatch) {
    // Remove everything from the price data onward
    description = description.substring(0, priceMatch.index);
  }
  
  // Clean up trailing whitespace and dashes
  description = description.trim().replace(/\s*-\s*$/, '').trim();
  
  // Calculate total shells and cost per shell
  const totalPacking = itemsPerCase * casesPerUnit;
  const hasPacking = packingMatch !== null;
  const totalShells = hasPacking ? casesOrdered * totalPacking : null; // null if packing unknown
  const costPerShell = totalPacking > 0 ? pricePerCase / totalPacking : pricePerCase;
  
  return {
    partNumber,
    description,
    quantity: totalShells,  // Total shells (null if packing unknown - needs manual entry)
    cost: hasPacking ? parseFloat(costPerShell.toFixed(2)) : pricePerCase,  // Cost per shell or per case
    packing: hasPacking ? `${itemsPerCase}/${casesPerUnit}` : null,
    itemsPerCase: hasPacking ? itemsPerCase : null,
    casesPerUnit: hasPacking ? casesPerUnit : null,
    casesOrdered: casesOrdered,  // Store original cases for reference
    needsPacking: !hasPacking  // Flag for items that need manual packing entry
  };
}

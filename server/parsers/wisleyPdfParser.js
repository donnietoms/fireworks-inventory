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
  // Packing format: X/Y where X = packages per case, Y = items per package
  const packingMatch = afterPartNumFull.match(/(\d+)\/(\d+)/);
  let packagesPerCase = 1;
  let itemsPerPackage = 1;
  
  if (packingMatch) {
    packagesPerCase = parseInt(packingMatch[1]);
    itemsPerPackage = parseInt(packingMatch[2]);
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
  let casesOrdered, pricePerCase, lineTotal;
  
  if (dataNumbers.length === 2) {
    // Exactly 2 numbers: quantity and price (line total = price)
    [casesOrdered, pricePerCase] = dataNumbers;
    lineTotal = pricePerCase;
  } else {
    // 3+ numbers: take last 3 as qty, unit_price, line_total
    casesOrdered = Math.floor(dataNumbers[dataNumbers.length - 3]);
    pricePerCase = dataNumbers[dataNumbers.length - 2];
    lineTotal = dataNumbers[dataNumbers.length - 1];
  }
  
  // Extract description from FULL LINE, but remove price data from ORIGINAL line position
  let description = afterPartNumFull;
  
  // Find where the price data starts in the ORIGINAL line
  const priceDataPattern = /\s+(\d+)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)(?=\s|$)/;
  const priceMatchInOriginal = afterPartNumOriginal.match(priceDataPattern);
  
  if (priceMatchInOriginal) {
    // Calculate where this is in the original line
    const priceStartIndex = priceMatchInOriginal.index;
    
    // If the full line is longer than original (has continuation), 
    // keep the continuation but remove the price section from the original part
    const originalPartLength = afterPartNumOriginal.length;
    const beforePrice = afterPartNumFull.substring(0, priceStartIndex);
    const continuation = afterPartNumFull.substring(originalPartLength);
    
    description = beforePrice + continuation;
  }
  
  // Remove packing notation (can appear anywhere in the description)
  if (packingMatch) {
    description = description.replace(/\s*-?\s*\d+\/\d+/g, '');
  }
  
  // Clean up: remove product codes, packing, trailing dashes
  description = description.trim()
    .replace(/\s*\([A-Z0-9-]+\)\s*/g, '') // Remove product codes like (CM-8-21) or (PBG)
    .replace(/\s*-\s*$/g, '') // Remove trailing dashes
    .trim();
  
  // Calculate total shells per case (packages × items per package)
  const totalPacking = packagesPerCase * itemsPerPackage;
  const hasPacking = packingMatch !== null;
  const totalShells = hasPacking ? casesOrdered * totalPacking : casesOrdered; // Use casesOrdered as quantity if no packing
  const invoiceLineTotal = parseFloat(lineTotal.toFixed(2)); // Exact line total from invoice
  
  // Calculate cost per shell: always lineTotal / quantity
  const costPerShell = totalShells > 0 ? invoiceLineTotal / totalShells : 0;
  
  return {
    partNumber,
    description,
    quantity: totalShells,  // Total shells (calculated from packing if available, otherwise just quantity ordered)
    cost: costPerShell,  // Cost per shell = lineTotal / quantity
    lineTotal: invoiceLineTotal,  // Store exact line total from invoice
    cases: casesOrdered,  // Number of cases ordered (or units if no packing)
    packing: hasPacking ? totalPacking : null,  // Total items per case (packagesPerCase × itemsPerPackage)
    packagesPerCase: hasPacking ? packagesPerCase : null,  // Number of packages in a case (X in X/Y)
    itemsPerPackage: hasPacking ? itemsPerPackage : null,  // Number of items per package (Y in X/Y)
    needsPacking: !hasPacking  // Flag for items that need manual packing entry
  };
}

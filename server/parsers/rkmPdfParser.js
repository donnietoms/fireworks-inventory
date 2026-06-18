import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Parse RKM Fireworks PDF using pdftotext
export async function parseRKMPDF(pdfPath) {
  try {
    // Run pdftotext with -layout flag to preserve column alignment
    const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
    
    const lines = stdout.split('\n');
    const items = [];
    let orderInfo = {
      orderNumber: null,
      orderDate: null,
      subtotal: 0,
      total: 0,
      discount: 0
    };
    
    // First pass: Extract order info
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Extract order number (e.g., "ORDER NUMBER:    RKM2205")
      const orderMatch = line.match(/ORDER NUMBER:\s*(\S+)/i);
      if (orderMatch) {
        orderInfo.orderNumber = orderMatch[1];
      }
      
      // Extract order date (e.g., "ORDER DATE:    5/15/2024")
      if (!orderInfo.orderDate) {
        const dateMatch = line.match(/ORDER DATE:\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
        if (dateMatch) {
          let month = dateMatch[1].padStart(2, '0');
          let day = dateMatch[2].padStart(2, '0');
          let year = dateMatch[3];
          if (year.length === 2) {
            year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
          }
          orderInfo.orderDate = `${year}-${month}-${day}`;
        }
      }
      
      // Extract total (look for "Total:" with value on same line)
      const totalMatch = line.match(/Total:\s*([\d,]+\.?\d*)\s*$/i);
      if (totalMatch) {
        const totalValue = parseFloat(totalMatch[1].replace(/,/g, ''));
        orderInfo.total = totalValue;
        orderInfo.subtotal = totalValue; // Use total as subtotal if subtotal not found separately
      }
    }
    
    // Second pass: Extract items
    let inDataSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) continue;
      
      // Look for the header row to start data section
      if (line.includes('Product ID') && line.includes('Description')) {
        inDataSection = true;
        continue;
      }
      
      // Skip non-data lines
      if (!inDataSection) continue;
      
      // Stop at summary section
      if (line.match(/Total:/i)) {
        break;
      }
      
      // Skip continuation lines (indented lines that don't start with a product ID)
      // Continuation lines typically start with whitespace
      if (line.match(/^\s{10,}/)) {
        continue;
      }
      
      // Parse the item line
      const item = parseRKMLine(line);
      if (item) {
        items.push(item);
      }
    }
    
    // Calculate discount if not found
    if (orderInfo.discount === 0 && orderInfo.subtotal > 0 && orderInfo.total > 0) {
      orderInfo.discount = orderInfo.subtotal - orderInfo.total;
    }
    
    // If total not found, use subtotal
    if (orderInfo.total === 0 && orderInfo.subtotal > 0) {
      orderInfo.total = orderInfo.subtotal;
    }
    
    return { items, orderInfo };
  } catch (error) {
    throw new Error(`Failed to parse RKM PDF: ${error.message}`);
  }
}

function parseRKMLine(line) {
  // Skip empty lines
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 10) {
    return null;
  }
  
  // RKM format: Product ID | Description | Packing | Quantity | List price | Unit price | Total
  // Example: NO-300X-S001  Compound Cake - 300 Shot...  cs 1/2  1  143.99  143.99  143.99
  
  // Extract product ID (starts at beginning of line)
  const partNumberMatch = trimmed.match(/^([A-Z0-9][-A-Z0-9_\/]+)/i);
  if (!partNumberMatch) {
    return null;
  }
  
  const partNumber = partNumberMatch[1].trim();
  
  // Get everything after the part number
  const afterPartNum = line.substring(line.indexOf(partNumber) + partNumber.length);
  
  // Extract packing format (e.g., "cs 1/2", "cs 4/1", "cs 8/1")
  // Format: cs X/Y where X = packages per case, Y = items per package
  const packingMatch = afterPartNum.match(/cs\s+(\d+)\/(\d+)/i);
  let packagesPerCase = 1;
  let itemsPerPackage = 1;
  let hasPacking = false;
  
  if (packingMatch) {
    packagesPerCase = parseInt(packingMatch[1]);
    itemsPerPackage = parseInt(packingMatch[2]);
    hasPacking = true;
  }
  
  // Extract all numbers (after packing notation)
  let afterPacking = afterPartNum;
  if (packingMatch) {
    afterPacking = afterPartNum.substring(afterPartNum.indexOf(packingMatch[0]) + packingMatch[0].length);
  }
  
  // Extract numbers: quantity, list price, unit price, total
  const allNumbers = afterPacking.match(/[\d,]+\.?\d*/g);
  if (!allNumbers || allNumbers.length < 2) {
    return null; // Need at least quantity and price
  }
  
  const dataNumbers = allNumbers.map(n => parseFloat(n.replace(/,/g, '')));
  
  if (dataNumbers.length < 2) {
    return null;
  }
  
  // RKM format has: quantity, list_price, unit_price, total (last number)
  // We need: quantity and total (last number)
  const casesOrdered = Math.floor(dataNumbers[0]); // First number is quantity
  const lineTotal = dataNumbers[dataNumbers.length - 1]; // Last number is total
  
  // Extract description (between part number and packing)
  let description = afterPartNum;
  
  // Remove packing notation
  if (packingMatch) {
    description = description.substring(0, description.indexOf(packingMatch[0]));
  } else {
    // If no packing, description is everything before the numbers
    const firstNumberIndex = afterPartNum.search(/\d+/);
    if (firstNumberIndex > 0) {
      description = afterPartNum.substring(0, firstNumberIndex);
    }
  }
  
  description = description.trim();
  
  // Calculate total items: quantity × packages per case × items per package
  const totalPacking = packagesPerCase * itemsPerPackage;
  const totalItems = hasPacking ? casesOrdered * packagesPerCase * itemsPerPackage : null;
  const invoiceLineTotal = parseFloat(lineTotal.toFixed(2));
  
  // Calculate cost per item: lineTotal ÷ (quantity × packing)
  const costPerItem = totalItems > 0 ? invoiceLineTotal / totalItems : null;
  
  return {
    partNumber,
    description,
    quantity: totalItems,  // Total items (null if packing unknown)
    cost: costPerItem,  // Cost per item = lineTotal ÷ total items
    lineTotal: invoiceLineTotal,  // Store exact line total from invoice
    cases: casesOrdered,  // Number of cases/units ordered from invoice
    packing: hasPacking ? totalPacking : null,  // Total items per case (packagesPerCase × itemsPerPackage)
    packagesPerCase: hasPacking ? packagesPerCase : null,  // Number of packages in a case (X in X/Y)
    itemsPerPackage: hasPacking ? itemsPerPackage : null,  // Number of items per package (Y in X/Y)
    needsPacking: !hasPacking  // Flag for items that need manual packing entry
  };
}

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Parse Fireworks Forever PDF invoices
// Format: Product ID | Description | Packing | Quantity | Price | Subtotal
export async function parseFireworksForeverPDF(pdfPath) {
  try {
    // Extract text from PDF using pdftotext
    const { stdout: text } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
    
    // Extract invoice number and date - try multiple patterns
    let invoiceNumber = null;
    let invoiceNumberMatch = text.match(/INVOICE\s+NUMBER\s*[:=]\s*([^\n\s]+)/i);
    if (!invoiceNumberMatch) {
      invoiceNumberMatch = text.match(/INV\s*#\s*([^\n\s]+)/i);
    }
    if (!invoiceNumberMatch) {
      invoiceNumberMatch = text.match(/INVOICE\s*#\s*([^\n\s]+)/i);
    }
    if (!invoiceNumberMatch) {
      invoiceNumberMatch = text.match(/Order\s*#\s*([^\n\s]+)/i);
    }
    invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1].trim() : null;
    
    const invoiceDateMatch = text.match(/INVOICE\s+DATE:?\s+(\d+\/\d+\/\d+)/i);
    let orderDate = null;
    if (invoiceDateMatch) {
      orderDate = parseDate(invoiceDateMatch[1]);
    }
    
    // Split by "Product ID" to find the table start
    const tableStartIndex = text.indexOf('Product ID');
    if (tableStartIndex === -1) {
      throw new Error('Could not find product table in Fireworks Forever invoice');
    }
    
    const tableSection = text.substring(tableStartIndex);
    const lines = tableSection.split('\n');
    
    const items = [];
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip header and empty lines
      if (line.toLowerCase().includes('product id') || !line) continue;
      
      // Stop at subtotal section
      if (line.toLowerCase().includes('subtotal:') || line.toLowerCase().includes('freight:')) break;
      
      // Try to parse as item line
      const item = parseFireworksForeverLine(line);
      if (item) {
        items.push(item);
        inTable = true;
      }
    }
    
    // Extract totals
    const subtotalMatch = text.match(/Subtotal:\s*([0-9,]+\.\d{2})/i);
    const freightMatch = text.match(/FREIGHT:\s*([0-9,]+\.\d{2})/i);
    const totalMatch = text.match(/Total:\s*([0-9,]+\.\d{2})/i);
    
    const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, '')) : 0;
    const freight = freightMatch ? parseFloat(freightMatch[1].replace(/,/g, '')) : 0;
    const total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;
    
    return {
      items: items,
      orderInfo: {
        orderNumber: invoiceNumber,
        orderDate: orderDate,
        subtotal: subtotal,
        discount: 0,
        total: total
      }
    };
  } catch (error) {
    console.error('Error parsing Fireworks Forever PDF:', error);
    throw error;
  }
}

// Parse a line from Fireworks Forever invoice
// Format: Product ID | Description | Packing (cs X/Y) | Quantity | Price | Subtotal
function parseFireworksForeverLine(line) {
  // Skip header-like lines and empty lines
  if (!line || line.length < 10) return null;
  
  const lower = line.toLowerCase();
  if (lower.includes('product id') || 
      lower.includes('description') || 
      lower.includes('packing') ||
      lower.includes('quantity') ||
      lower.includes('price') ||
      lower.includes('subtotal') ||
      lower.includes('total') ||
      lower.includes('freight')) {
    return null;
  }
  
  // Extract packing pattern first (e.g., "cs 4/1" or "cs 12/1")
  const packingRegex = /cs\s+(\d+)\/(\d+)/i;
  const packingMatch = line.match(packingRegex);
  
  if (!packingMatch) {
    return null; // No valid packing format found
  }
  
  const packagesPerCase = parseInt(packingMatch[1]);
  const itemsPerPackage = parseInt(packingMatch[2]);
  
  // Split the line into sections: before packing, packing, and after packing
  const packingPos = line.indexOf(packingMatch[0]);
  const beforePacking = line.substring(0, packingPos).trim();
  const afterPacking = line.substring(packingPos + packingMatch[0].length).trim();
  
  // Parse before packing: Product ID and Description
  const beforeParts = beforePacking.split(/\s+/);
  if (beforeParts.length < 2) return null;
  
  const partNumber = beforeParts[0];
  const description = beforeParts.slice(1).join(' ');
  
  // Validate product ID format (alphanumeric)
  if (!partNumber || !/^[A-Z0-9]+$/.test(partNumber)) {
    return null;
  }
  
  // Parse after packing: Quantity | Price | Subtotal
  const afterParts = afterPacking.split(/\s+/);
  if (afterParts.length < 3) return null;
  
  const quantityStr = afterParts[0];
  const priceStr = afterParts[1];
  const subtotalStr = afterParts[2];
  
  const cases = parseInt(quantityStr) || 0;
  const cost = parseFloat(priceStr.replace(/[,$]/g, '')) || 0;
  const lineTotal = parseFloat(subtotalStr.replace(/[,$]/g, '')) || 0;
  
  if (cases === 0) return null;
  
  const totalItems = cases * packagesPerCase * itemsPerPackage;
  
  return {
    partNumber: partNumber,
    description: description,
    cases: cases,
    packing: packagesPerCase * itemsPerPackage,
    packagesPerCase: packagesPerCase,
    itemsPerPackage: itemsPerPackage,
    quantity: totalItems,
    cost: cost,
    lineTotal: lineTotal
  };
}

// Parse date from MM/DD/YYYY format
function parseDate(dateStr) {
  const [month, day, year] = dateStr.split('/').map(x => parseInt(x));
  if (month && day && year) {
    const date = new Date(year, month - 1, day);
    return date.toISOString().split('T')[0];
  }
  return null;
}


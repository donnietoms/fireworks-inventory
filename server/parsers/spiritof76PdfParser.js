// Spirit of 76 PDF Parser (New Format - 2025)
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function parseSpiritOf76PDF(pdfPath) {
  try {
    // Extract text from PDF using pdftotext with -layout option
    const { stdout } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    const text = stdout;

    // Extract invoice number (format: #INV10393)
    const invoiceMatch = text.match(/#INV(\d+)/);
    const orderNumber = invoiceMatch ? invoiceMatch[1] : null;

    // Extract date (format: 12/5/2025 - MM/D/YYYY or MM/DD/YYYY)
    const dateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    let orderDate = null;
    if (dateMatch) {
      const month = dateMatch[1].padStart(2, '0');
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      orderDate = `${year}-${month}-${day}`;
    }

    // Extract totals
    const subtotalMatch = text.match(/Pre Discount Subtotal\s+([\d,]+\.?\d*)/);
    const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, '')) : 0;

    const taxMatch = text.match(/Tax Total[^0-9]*([\d,]+\.?\d*)/);
    const tax = taxMatch ? parseFloat(taxMatch[1].replace(/,/g, '')) : 0;

    const totalMatch = text.match(/(?:^|\n)\s*Total\s+([\d,]+\.?\d*)/m);
    const total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;

    // Parse line items
    const items = [];
    const lines = text.split('\n');
    const seenItems = new Set(); // Track seen items to avoid duplicates
    
    let inItemsSection = false;
    let currentItem = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Start of items section
      if (line.includes('Quantity') && line.includes('Item') && line.includes('Name') && line.includes('Packing')) {
        inItemsSection = true;
        continue;
      }
      
      // End of items section
      if (line.includes('Pre Discount Subtotal') || line.includes('Tax Total')) {
        inItemsSection = false;
        if (currentItem && currentItem.partNumber) {
          const itemKey = `${currentItem.partNumber}-${currentItem.quantity}-${currentItem.lineTotal}`;
          if (!seenItems.has(itemKey)) {
            items.push(currentItem);
            seenItems.add(itemKey);
          }
        }
        break;
      }
      
      if (!inItemsSection || !line.trim()) continue;
      
      // Parse item lines - new format with layout:
      // Quantity    Item        Name                              Packing       Piece Price     Case Price        Amount
      // Multi-line descriptions continue on next line (indented)
      
      // Match line with quantity at start (number followed by item code)
      const itemMatch = line.match(/^\s+(\d+)\s+([A-Z0-9]+)\s+(.+?)\s+(\d+\/\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*$/);
      
      if (itemMatch) {
        // Save previous item if exists
        if (currentItem && currentItem.partNumber) {
          const itemKey = `${currentItem.partNumber}-${currentItem.quantity}-${currentItem.lineTotal}`;
          if (!seenItems.has(itemKey)) {
            items.push(currentItem);
            seenItems.add(itemKey);
          }
        }
        
        const [, cases, sku, description, packing, piecePrice, casePrice, amount] = itemMatch;
        
        const [packagesPerCase, itemsPerPackage] = packing.split('/').map(n => parseInt(n));
        const packingTotal = packagesPerCase * itemsPerPackage;
        const quantity = parseInt(cases) * packingTotal;
        const lineTotal = parseFloat(amount);
        const cost = quantity > 0 ? lineTotal / quantity : parseFloat(piecePrice);
        
        currentItem = {
          partNumber: sku.trim(),
          description: description.trim(),
          cases: parseInt(cases),
          packagesPerCase,
          itemsPerPackage,
          packing: packingTotal,
          quantity,
          cost,
          lineTotal
        };
      } else if (currentItem && line.trim() && !line.match(/^\s+\d+\s+[A-Z]/)) {
        // This is a continuation of the description (indented, no quantity/sku at start)
        const continuation = line.trim();
        if (continuation && continuation.length > 2) {
          currentItem.description += ' ' + continuation;
        }
      }
    }
    
    // Add last item
    if (currentItem && currentItem.partNumber) {
      const itemKey = `${currentItem.partNumber}-${currentItem.quantity}-${currentItem.lineTotal}`;
      if (!seenItems.has(itemKey)) {
        items.push(currentItem);
        seenItems.add(itemKey);
      }
    }

    return {
      items,
      orderInfo: {
        orderNumber,
        orderDate,
        subtotal,
        discount: 0,
        total
      }
    };
  } catch (error) {
    console.error('Error parsing Spirit of 76 PDF:', error);
    throw new Error(`Failed to parse Spirit of 76 invoice: ${error.message}`);
  }
}

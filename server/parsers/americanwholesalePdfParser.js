// American Wholesale Fireworks PDF Parser
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function parseAmericanWholesalePDF(pdfPath) {
  try {
    // Extract text from PDF using pdftotext with -layout option
    const { stdout } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    const text = stdout;

    // Extract order number
    const orderMatch = text.match(/Order:\s*#?(\d+)/);
    const orderNumber = orderMatch ? orderMatch[1] : null;

    // Extract date (format: Jul 18th 2024)
    const dateMatch = text.match(/Order Date:\s*([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)?\s+(\d{4})/);
    let orderDate = null;
    if (dateMatch) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.findIndex(m => dateMatch[1].startsWith(m));
      if (monthIndex >= 0) {
        const month = String(monthIndex + 1).padStart(2, '0');
        const day = String(dateMatch[2]).padStart(2, '0');
        orderDate = `${dateMatch[3]}-${month}-${day}`;
      }
    }

    // Extract totals
    const subtotalMatch = text.match(/Subtotal\s+\$?([\d,]+\.?\d*)/);
    const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, '')) : 0;

    const shippingMatch = text.match(/Shipping\s+\$?([\d,]+\.?\d*)/);
    const shipping = shippingMatch ? parseFloat(shippingMatch[1].replace(/,/g, '')) : 0;

    const totalMatch = text.match(/Grand total\s+\$?([\d,]+\.?\d*)/);
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
      if (line.includes('Order Items') || line.includes('Qty Code/SKU')) {
        inItemsSection = true;
        continue;
      }
      
      // End of items section
      if (line.includes('Subtotal') || line.includes('Comments')) {
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
      
      // Parse item lines - format with layout:
      // Qty Code/SKU            Product Name                                                Price                Total
      // Multi-line descriptions can continue on next lines
      // Sometimes SKU is split across lines (e.g., "PFX30CM-" then "P-H")
      
      // Match line with quantity at the start and pricing at the end
      const itemMatch = line.match(/^\s*(\d+)\s+(.+?)\s+\$(\d+\.?\d*)\s+\$(\d+\.?\d*)$/);
      
      if (itemMatch) {
        // Save previous item if exists
        if (currentItem && currentItem.partNumber) {
          const itemKey = `${currentItem.partNumber}-${currentItem.quantity}-${currentItem.lineTotal}`;
          if (!seenItems.has(itemKey)) {
            items.push(currentItem);
            seenItems.add(itemKey);
          }
        }
        
        const [, quantity, skuAndDescription, price, lineTotal] = itemMatch;
        
        // Split SKU from description - SKU is typically alphanumeric with hyphens
        const skuMatch = skuAndDescription.match(/^([A-Z0-9\-]+)\s+(.+)$/);
        let sku, description;
        
        if (skuMatch) {
          sku = skuMatch[1].trim();
          description = skuMatch[2].trim();
          
          // Check if SKU ends with hyphen (likely continuation on next line)
          if (sku.endsWith('-') && i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            // If next line is just a short alphanumeric string, it's the SKU continuation
            if (nextLine && nextLine.match(/^[A-Z0-9\-]+$/) && nextLine.length < 10) {
              sku += nextLine;
              i++; // Skip next line since we consumed it
            }
          }
        } else {
          // If no clear split, treat first word as SKU
          const parts = skuAndDescription.trim().split(/\s+/);
          sku = parts[0];
          description = parts.slice(1).join(' ');
        }
        
        // Create new item - AWF sells individual items, not cases
        // Packing defaults to 1/1 (individual items)
        currentItem = {
          partNumber: sku,
          description: description,
          cases: parseInt(quantity),
          packagesPerCase: 1,
          itemsPerPackage: 1,
          packing: 1,
          quantity: parseInt(quantity),
          cost: parseFloat(price),
          lineTotal: parseFloat(lineTotal)
        };
      } else if (currentItem && line.trim() && !line.includes('$')) {
        // This is a continuation of the description
        const continuation = line.trim();
        // Make sure it's not a SKU continuation (already handled above) or new item line
        if (continuation && 
            !continuation.match(/^\d+\s+[A-Z]/) && 
            !continuation.match(/^[A-Z0-9\-]+$/) &&
            continuation.length > 5) {
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
    console.error('Error parsing American Wholesale Fireworks PDF:', error);
    throw new Error(`Failed to parse American Wholesale Fireworks invoice: ${error.message}`);
  }
}

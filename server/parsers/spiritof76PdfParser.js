// Spirit of 76 PDF Parser
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function parseSpiritOf76PDF(pdfPath) {
  try {
    // Extract text from PDF using pdftotext with -layout option
    const { stdout } = await execAsync(`pdftotext -layout "${pdfPath}" -`);
    const text = stdout;

    // Extract order number
    const orderMatch = text.match(/Order:\s*(\d+)/);
    const orderNumber = orderMatch ? orderMatch[1] : null;

    // Extract date (format: 06/14/23 10:26a)
    const dateMatch = text.match(/Created:\s*(\d{2}\/\d{2}\/\d{2})/);
    let orderDate = null;
    if (dateMatch) {
      // Convert MM/DD/YY to YYYY-MM-DD
      const [month, day, year] = dateMatch[1].split('/');
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      orderDate = `${fullYear}-${month}-${day}`;
    }

    // Extract totals
    const subtotalMatch = text.match(/Sub-Total:\s*\$?([\d,]+\.?\d*)/);
    const subtotal = subtotalMatch ? parseFloat(subtotalMatch[1].replace(/,/g, '')) : 0;

    // Extract discount (coupon code)
    const discountMatch = text.match(/Coupon Code[^:]*:\s*-?\$?([\d,]+\.?\d*)/);
    const discount = discountMatch ? parseFloat(discountMatch[1].replace(/,/g, '')) : 0;

    // Extract total
    const totalMatch = text.match(/Total:\s*\$?([\d,]+\.?\d*)/);
    const total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;

    // Parse line items
    const items = [];
    const lines = text.split('\n');
    
    let inItemsSection = false;
    let pendingDescription = ''; // For descriptions that appear before the model line
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Start of items section (after header row)
      if (line.includes('Model') && line.includes('Product Name') && line.includes('Packaging')) {
        inItemsSection = true;
        continue;
      }
      
      // End of items section
      if (line.includes('Sub-Total:')) {
        inItemsSection = false;
        break;
      }
      
      if (!inItemsSection || !line.trim()) continue;
      
      // Parse item lines - format with layout:
      // MODEL      Description                                                      $Price         Packing         $UnitCost      Qty    $Cost
      // Some items have description on previous line (e.g., TB440)
      
      // Match line with model number at start
      const match = line.match(/^([A-Z0-9]+)\s+(.+?)\s+\$(\S+)\s+(\d+\/\d+)\s+(?:\$\S+\s+)?(\d+)\s+\$(\S+)/);
      
      if (match) {
        const [, partNumber, description, , packing, cases, lineTotal] = match;
        
        // Use pending description if current description is empty/truncated
        let finalDescription = description.trim();
        if (pendingDescription && (!finalDescription || finalDescription.length < 5)) {
          finalDescription = pendingDescription;
        }
        pendingDescription = ''; // Reset
        
        const [packagesPerCase, itemsPerPackage] = packing.split('/').map(n => parseInt(n));
        const packingTotal = packagesPerCase * itemsPerPackage;
        const quantity = parseInt(cases) * packingTotal;
        const total = parseFloat(lineTotal.replace(/,/g, ''));
        const cost = quantity > 0 ? total / quantity : 0;
        
        if (total > 0) {
          items.push({
            partNumber: partNumber.trim(),
            description: finalDescription,
            cases: parseInt(cases),
            packagesPerCase,
            itemsPerPackage,
            packing: packingTotal,
            quantity,
            cost,
            lineTotal: total
          });
        }
      } else if (line.match(/^\s+[A-Z]/) && !line.includes('$')) {
        // This might be a description line before the model number (like TB440)
        pendingDescription = line.trim();
      }
    }

    return {
      items: items.filter(item => item.lineTotal > 0), // Filter out $0.00 items
      orderInfo: {
        orderNumber,
        orderDate,
        subtotal,
        discount,
        total
      }
    };
  } catch (error) {
    console.error('Error parsing Spirit of 76 PDF:', error);
    throw new Error(`Failed to parse Spirit of 76 invoice: ${error.message}`);
  }
}

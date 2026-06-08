import * as XLSX from 'xlsx';

// Wisley Pyrotechnics import parser
export const parseWisleyExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        const items = [];
        
        // Find the header row (contains "Product ID")
        let headerIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
          const firstCol = Object.values(jsonData[i])[0];
          if (typeof firstCol === 'string' && firstCol.toLowerCase().includes('product id')) {
            headerIndex = i;
            break;
          }
        }
        
        if (headerIndex === -1) {
          reject(new Error('Could not find "Product ID" header row'));
          return;
        }
        
        // Process rows after header
        for (let i = headerIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const values = Object.values(row);
          
          // Get Product ID (first column)
          const partNumber = String(values[0] || '').trim();
          
          // Skip if no part number or it's a total/summary row
          if (!partNumber || 
              partNumber.toLowerCase().includes('total') ||
              partNumber.toLowerCase().includes('subtotal') ||
              partNumber.toLowerCase().includes('shipping')) {
            continue;
          }
          
          // Get Description - handle merged cells by checking multiple columns
          // In Wisley format, description can be in columns 1-7 due to merged cells
          let description = '';
          for (let col = 1; col <= 7; col++) {
            const val = String(values[col] || '').trim();
            if (val && val.length > 0 && !Number.isFinite(Number(val))) {
              // Found text that's not a number
              description = val;
              break;
            }
          }
          
          // Find Quantity - look for numeric values that are whole numbers
          // Skip the first few values as they might be part numbers or description
          let quantity = 0;
          for (let j = 1; j < values.length; j++) {
            const val = values[j];
            if (typeof val === 'number' && Number.isInteger(val) && val > 0 && val < 10000) {
              quantity = val;
              break;
            }
          }
          
          // Find Unit Price - look for decimal numbers (excluding subtotal which is last)
          let cost = 0;
          const decimals = values.filter(v => typeof v === 'number' && !Number.isInteger(v) && v > 0);
          if (decimals.length >= 2) {
            // Second-to-last is unit price, last is subtotal
            cost = decimals[decimals.length - 2];
          } else if (decimals.length === 1) {
            cost = decimals[0];
          } else {
            // Look for integers that might be prices (100-1000 range typically)
            const prices = values.filter(v => typeof v === 'number' && v >= 10 && v < 100000);
            if (prices.length >= 2) {
              // Second-to-last is likely unit price
              cost = prices[prices.length - 2];
            } else if (prices.length === 1) {
              cost = prices[0];
            }
          }
          
          items.push({
            partNumber,
            description,
            quantity: quantity || 1,
            cost: cost || 0
          });
        }
        
        resolve({
          items,
          vendor: 'Wisley Pyrotechnics',
          columnMap: {},
          headers: ['Product ID', 'Description', 'Quantity', 'Unit Price'],
          rawData: jsonData
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
};

// Generic vendor detection and routing
export const parseVendorFile = async (file) => {
  const fileName = file.name.toLowerCase();
  
  // Check for Wisley format
  if (fileName.includes('wisley') || fileName.includes('sale')) {
    return parseWisleyExcel(file);
  }
  
  // Add more vendors here in the future
  // if (fileName.includes('vendor2')) { return parseVendor2Excel(file); }
  
  // Default: try Wisley format
  return parseWisleyExcel(file);
};

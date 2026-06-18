import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Normalize column names to match expected format
const normalizeColumnName = (name) => {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  
  // Part Number variations (includes Product ID)
  if (lower.includes('part') || lower.includes('sku') || lower.includes('item')) {
    return 'partNumber';
  }
  if (lower.includes('product') && (lower.includes('id') || lower.includes('number'))) {
    return 'partNumber';
  }
  if (lower === 'pn' || lower === 'p/n' || lower === 'item#' || lower === 'sku' || lower === 'id') {
    return 'partNumber';
  }
  
  // Description variations
  if (lower.includes('desc') || lower.includes('name') || lower.includes('title')) {
    return 'description';
  }
  
  // Quantity variations
  if (lower.includes('qty') || lower.includes('quant') || lower.includes('count') || lower.includes('amount')) {
    return 'quantity';
  }
  
  // Cost/Price variations
  if (lower.includes('cost') || lower.includes('price') || lower.includes('total') || lower.includes('unit')) {
    return 'cost';
  }
  
  return lower;
};

// Parse a numeric value from various formats
const parseNumber = (value) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Remove currency symbols, commas, and whitespace
  const cleaned = String(value).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Map raw row data to inventory item format
const mapRowToItem = (row, columnMap) => {
  const item = {
    partNumber: '',
    description: '',
    quantity: 0,
    cost: 0,
    // Default to 1/1 packing for generic imports (individual items)
    cases: 0,
    packagesPerCase: 1,
    itemsPerPackage: 1,
    packing: 1,
    lineTotal: 0
  };
  
  for (const [originalCol, normalizedCol] of Object.entries(columnMap)) {
    const value = row[originalCol];
    if (normalizedCol === 'partNumber') {
      item.partNumber = String(value || '').trim();
    } else if (normalizedCol === 'description') {
      item.description = String(value || '').trim();
    } else if (normalizedCol === 'quantity') {
      item.quantity = parseNumber(value);
    } else if (normalizedCol === 'cost') {
      item.cost = parseNumber(value);
    }
  }
  
  // For generic CSV import: quantity is total items, cases = quantity, packing = 1/1
  if (item.quantity > 0) {
    item.cases = item.quantity; // Each item is 1 "case"
    item.lineTotal = item.cost * item.quantity; // Calculate line total from cost and quantity
  }
  
  // Flag items missing part number for manual entry
  item.needsPartNumber = !item.partNumber || item.partNumber.trim() === '';
  
  return item;
};

// Build column mapping from headers
const buildColumnMap = (headers) => {
  const map = {};
  headers.forEach(header => {
    const normalized = normalizeColumnName(header);
    if (['partNumber', 'description', 'quantity', 'cost'].includes(normalized)) {
      map[header] = normalized;
    }
  });
  return map;
};

// Parse CSV file
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }
        
        const headers = results.meta.fields || [];
        const columnMap = buildColumnMap(headers);
        
        const items = results.data
          .map(row => mapRowToItem(row, columnMap))
          .filter(item => item.partNumber || item.description); // Filter empty rows
        
        resolve({
          items,
          columnMap,
          headers,
          rawData: results.data
        });
      },
      error: (error) => reject(error)
    });
  });
};

// Parse Excel file
export const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        
        if (jsonData.length === 0) {
          resolve({ items: [], columnMap: {}, headers: [], rawData: [] });
          return;
        }
        
        const headers = Object.keys(jsonData[0]);
        const columnMap = buildColumnMap(headers);
        
        const items = jsonData
          .map(row => mapRowToItem(row, columnMap))
          .filter(item => item.partNumber || item.description);
        
        resolve({
          items,
          columnMap,
          headers,
          rawData: jsonData,
          sheetNames: workbook.SheetNames
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsArrayBuffer(file);
  });
};

// Parse PDF file - extracts text and attempts to find tabular data
export const parsePDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        
        const allTextItems = [];
        
        // Extract text from all pages with position info
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Get items with position
          const items = textContent.items.map(item => ({
            text: item.str,
            x: Math.round(item.transform[4]),
            y: Math.round(item.transform[5]),
            width: item.width
          }));
          
          allTextItems.push(...items);
        }
        
        // Debug: log extracted text
        console.log('PDF Text Items:', allTextItems.map(i => i.text).join(' | '));
        
        // Try to parse as tabular data using position-based grouping
        const items = parseTextItemsToRows(allTextItems);
        
        console.log('Parsed items:', items);
        
        resolve({
          items,
          columnMap: {},
          headers: ['Part Number', 'Description', 'Quantity', 'Cost'],
          rawData: allTextItems,
          isPDF: true
        });
      } catch (error) {
        reject(new Error(`Error parsing PDF: ${error.message}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Error reading PDF file'));
    reader.readAsArrayBuffer(file);
  });
};

// Group text items by Y position to reconstruct rows
const parseTextItemsToRows = (textItems) => {
  // Group items by Y position (within a tolerance)
  const yTolerance = 5;
  const rows = [];
  
  // Sort by Y (descending - PDF coordinates start from bottom) then X
  const sorted = [...textItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= yTolerance) {
      return a.x - b.x;
    }
    return b.y - a.y;
  });
  
  let currentRow = [];
  let currentY = null;
  
  for (const item of sorted) {
    if (currentY === null || Math.abs(item.y - currentY) <= yTolerance) {
      currentRow.push(item);
      currentY = item.y;
    } else {
      if (currentRow.length > 0) {
        rows.push(currentRow.sort((a, b) => a.x - b.x));
      }
      currentRow = [item];
      currentY = item.y;
    }
  }
  if (currentRow.length > 0) {
    rows.push(currentRow.sort((a, b) => a.x - b.x));
  }
  
  // Convert rows to text lines
  const lines = rows.map(row => row.map(item => item.text).join(' '));
  
  // Debug: log all lines
  console.log('PDF Lines:', lines);
  
  const items = [];
  
  // Process all lines, looking for product data
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const item = parseWisleyLine(line);
    if (item) {
      items.push(item);
    }
  }
  
  return items;
};

// Parse a line from Wisley Pyrotechnics format
// Format: Product ID | Description | Packing | Quantity | Unit price | Subtotal
const parseWisleyLine = (line) => {
  // Skip empty lines
  if (!line || line.trim() === '') {
    return null;
  }
  
  // Skip header lines, totals, and other non-data lines
  const lower = line.toLowerCase();
  if (lower.includes('product id') || 
      (lower.includes('description') && lower.includes('quantity')) ||
      (lower.includes('subtotal') && lower.includes('total')) ||
      lower.includes('ship from') ||
      lower.includes('ship to') ||
      lower.includes('bill to') ||
      lower.includes('order number') ||
      lower.includes('order date') ||
      lower.includes('sales order') ||
      lower.includes('customer po') ||
      lower.includes('due date') ||
      lower.includes('leatherwood') ||
      lower.includes('pyrotechnics') ||
      lower.includes('phone:') ||
      lower.includes('www.') ||
      lower.includes('packing') && lower.includes('unit price')) {
    return null;
  }
  
  // Wisley part number patterns - look anywhere in the line
  // FK-8-GTW, WPI-6-GTW, AM-3-BGC, AM-3-SGC, etc.
  const partNumberPatterns = [
    /\b([A-Z]{2,4}-\d+-[A-Z]{2,4})\b/i,      // FK-8-GTW, WPI-6-GTW
    /\b([A-Z]{2,4}-\d+-[A-Z]{1,4})\b/i,      // AM-3-BGC
    /\b([A-Z]{2}-\d+-[A-Z]+)\b/i,            // AM-3-SGC
    /\b([A-Z]{2,4}-\d+)\b/i,                 // WPI-5
    /\b([A-Z]{2}\d{4,6})\b/i,                // BP1234
  ];
  
  let partNumber = '';
  for (const pattern of partNumberPatterns) {
    const match = line.match(pattern);
    if (match) {
      partNumber = match[1].trim();
      break;
    }
  }
  
  if (!partNumber) {
    console.log('No part number found in:', line);
    return null;
  }
  
  // Extract all numbers from the line (for qty, prices)
  const numbers = line.match(/\d+\.?\d*/g) || [];
  const decimalNumbers = numbers.filter(n => n.includes('.')).map(n => parseFloat(n));
  const wholeNumbers = numbers.filter(n => !n.includes('.') && !partNumber.includes(n)).map(n => parseInt(n));
  
  // Get description - text after part number, before the numeric columns
  let description = '';
  const partNumIndex = line.indexOf(partNumber);
  const afterPartNum = line.substring(partNumIndex + partNumber.length);
  
  // Get text portion (letters, spaces, hyphens, quotes, parentheses)
  const descMatch = afterPartNum.match(/^[\s\-]*([A-Za-z][A-Za-z0-9\s\-'"()\/]+)/);
  if (descMatch) {
    description = descMatch[1].trim();
    // Clean up - remove trailing fragments
    description = description.replace(/\s*-\s*$/, '').trim();
    description = description.replace(/\s+\d+\/\d+\s*$/, '').trim(); // Remove packing like "1/1"
  }
  
  // Quantity: look for small whole numbers (typically 1-999)
  let quantity = 1;
  const smallNumbers = wholeNumbers.filter(n => n > 0 && n < 500);
  if (smallNumbers.length > 0) {
    quantity = smallNumbers[0];
  }
  
  // Cost: Unit price is typically second-to-last decimal, last is subtotal
  let cost = 0;
  if (decimalNumbers.length >= 2) {
    cost = decimalNumbers[decimalNumbers.length - 2];
  } else if (decimalNumbers.length === 1) {
    cost = decimalNumbers[0];
  }
  
  console.log('Parsed line:', { line: line.substring(0, 60), partNumber, description: description.substring(0, 30), quantity, cost });
  
  if (partNumber) {
    return {
      partNumber,
      description: description || '',
      quantity,
      cost
    };
  }
  
  return null;
};

// Parse extracted text to find inventory items (fallback method)
const parseTextToItems = (text, textItems) => {
  const items = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const item = parseWisleyLine(line);
    if (item) {
      items.push(item);
    }
  }
  
  return items;
};

// Parse any supported file type
export const parseFile = async (file) => {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    return parseCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcel(file);
  } else if (fileName.endsWith('.pdf')) {
    return parsePDF(file);
  } else if (fileName.endsWith('.json')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          // Handle both array of items and wrapped format
          const items = Array.isArray(data) ? data : (data.items || data.inventory || []);
          resolve({
            items: items.map(item => {
              const partNumber = item.partNumber || item.part_number || item.sku || '';
              return {
                partNumber,
                description: item.description || item.name || item.desc || '',
                quantity: parseNumber(item.quantity || item.qty || 0),
                cost: parseNumber(item.cost || item.price || 0),
                needsPartNumber: !partNumber || partNumber.trim() === ''
              };
            }),
            columnMap: {},
            headers: [],
            rawData: data
          });
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  } else {
    throw new Error(`Unsupported file type: ${fileName}`);
  }
};

// Export inventory to CSV
export const exportToCSV = (inventory) => {
  const csv = Papa.unparse(inventory.map(item => ({
    'Part Number': item.partNumber,
    'Description': item.description,
    'Quantity': item.quantity,
    'Cost': item.cost
  })));
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fireworks_inventory_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export inventory to Excel
export const exportToExcel = (inventory) => {
  const worksheet = XLSX.utils.json_to_sheet(inventory.map(item => ({
    'Part Number': item.partNumber,
    'Description': item.description,
    'Quantity': item.quantity,
    'Cost': item.cost
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  
  XLSX.writeFile(workbook, `fireworks_inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export order to CSV
export const exportOrderToCSV = (order) => {
  const rows = [
    ['Order Number', order.orderNumber],
    ['Order Date', order.orderDate || 'N/A'],
    ['Vendor', order.vendor || 'N/A'],
    [''],
    ['Part Number', 'Description', 'Packing', 'Qty Ordered', 'Total Items', 'Cost/Item', 'Line Total']
  ];

  order.items.forEach(item => {
    rows.push([
      item.partNumber,
      item.description,
      item.packagesPerCase && item.itemsPerPackage ? `${item.packagesPerCase}/${item.itemsPerPackage}` : '-',
      item.cases || 0,
      item.quantity || 0,
      item.cost?.toFixed(4) || '0.0000',
      item.lineTotal?.toFixed(2) || '0.00'
    ]);
  });

  rows.push(['']);
  rows.push(['Subtotal', '', '', '', '', '', order.subtotal?.toFixed(2) || '0.00']);
  rows.push(['Discount', '', '', '', '', '', order.discount?.toFixed(2) || '0.00']);
  rows.push(['Total', '', '', '', '', '', order.total?.toFixed(2) || '0.00']);

  const csv = Papa.unparse(rows);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `order_${order.orderNumber}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export order to Excel
export const exportOrderToExcel = (order) => {
  const headerData = [
    ['Order Number', order.orderNumber],
    ['Order Date', order.orderDate || 'N/A'],
    ['Vendor', order.vendor || 'N/A'],
    []
  ];

  const itemsData = order.items.map(item => ({
    'Part Number': item.partNumber,
    'Description': item.description,
    'Packing': item.packagesPerCase && item.itemsPerPackage ? `${item.packagesPerCase}/${item.itemsPerPackage}` : '-',
    'Qty Ordered': item.cases || 0,
    'Total Items': item.quantity || 0,
    'Cost/Item': parseFloat(item.cost?.toFixed(4)) || 0,
    'Line Total': parseFloat(item.lineTotal?.toFixed(2)) || 0
  }));

  const footerData = [
    {},
    { 'Part Number': 'Subtotal', 'Line Total': parseFloat(order.subtotal?.toFixed(2)) || 0 },
    { 'Part Number': 'Discount', 'Line Total': parseFloat(order.discount?.toFixed(2)) || 0 },
    { 'Part Number': 'Total', 'Line Total': parseFloat(order.total?.toFixed(2)) || 0 }
  ];

  const allData = [...headerData.map(row => ({ 'Part Number': row[0], 'Description': row[1] })), ...itemsData, ...footerData];
  
  const worksheet = XLSX.utils.json_to_sheet(allData, { skipHeader: false });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Order');
  
  XLSX.writeFile(workbook, `order_${order.orderNumber}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export show to CSV
export const exportShowToCSV = (show) => {
  const rows = [
    ['Show Name', show.name],
    ['Date', show.date || 'N/A'],
    ['Location', show.location || 'N/A'],
    [''],
    ['Part Number', 'Description', 'Quantity', 'Cost', 'Total']
  ];

  show.items.forEach(item => {
    rows.push([
      item.partNumber,
      item.description,
      item.quantity || 0,
      item.cost?.toFixed(2) || '0.00',
      (item.quantity * item.cost)?.toFixed(2) || '0.00'
    ]);
  });

  rows.push(['']);
  rows.push(['Total Items', '', show.totalItems || 0, '', '']);
  rows.push(['Total Value', '', '', '', show.totalValue?.toFixed(2) || '0.00']);

  const csv = Papa.unparse(rows);
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `show_${show.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// Export show to Excel
export const exportShowToExcel = (show) => {
  const headerData = [
    ['Show Name', show.name],
    ['Date', show.date || 'N/A'],
    ['Location', show.location || 'N/A'],
    []
  ];

  const itemsData = show.items.map(item => ({
    'Part Number': item.partNumber,
    'Description': item.description,
    'Quantity': item.quantity || 0,
    'Cost': parseFloat(item.cost?.toFixed(2)) || 0,
    'Total': parseFloat((item.quantity * item.cost)?.toFixed(2)) || 0
  }));

  const footerData = [
    {},
    { 'Part Number': 'Total Items', 'Quantity': show.totalItems || 0 },
    { 'Part Number': 'Total Value', 'Total': parseFloat(show.totalValue?.toFixed(2)) || 0 }
  ];

  const allData = [...headerData.map(row => ({ 'Part Number': row[0], 'Description': row[1] })), ...itemsData, ...footerData];
  
  const worksheet = XLSX.utils.json_to_sheet(allData, { skipHeader: false });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Show');
  
  XLSX.writeFile(workbook, `show_${show.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Parse shoot list from CSV format (comma-separated, first row is header)
export const parseShootListCSV = async (file) => {
  try {
    const text = await file.text();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      return { items: [], showInfo: { name: null, date: null }, fileName: file.name };
    }
    
    const items = [];
    
    // First row is header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(col => col.trim().toLowerCase());
    
    // Validate header columns in exact order: Part Number, Description, Quantity
    const expectedHeaders = ['part number', 'description', 'quantity'];
    const matchesExpected = expectedHeaders.every((expected, index) => {
      return headers[index] && headers[index].includes(expected.split(' ')[0]);
    });
    
    if (!matchesExpected) {
      throw new Error('CSV must have columns in order: Part Number, Description, Quantity');
    }
    
    // Parse data rows (starting from row 1)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      const columns = line.split(',').map(col => col.trim());
      
      if (columns.length < 3) continue;
      
      const partNumber = columns[0];
      const description = columns[1];
      const quantityStr = columns[2];
      
      // Skip if Part Number is empty
      if (!partNumber) continue;
      
      const quantity = parseInt(quantityStr);
      
      // Only add if quantity is a valid number
      if (!isNaN(quantity) && quantity > 0) {
        items.push({
          partNumber: partNumber,
          description: description,
          quantity: quantity
        });
      }
    }
    
    return {
      items,
      showInfo: { name: null, date: null },
      fileName: file.name
    };
  } catch (error) {
    console.error('Error parsing shoot list CSV:', error);
    throw new Error('Failed to parse shoot list: ' + error.message);
  }
};

// Parse Excel shoot list (XLSX/XLS format)
export const parseShootListExcel = async (file) => {
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(data, { type: 'array' });
    
    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    if (jsonData.length === 0) {
      return { items: [], showInfo: { name: null, date: null }, fileName: file.name };
    }
    
    // Get column names from first row
    const headers = Object.keys(jsonData[0]).map(h => h.toLowerCase());
    
    // Validate header columns in exact order: Part Number, Description, Quantity
    const expectedHeaders = ['part number', 'description', 'quantity'];
    const matchesExpected = expectedHeaders.every((expected, index) => {
      return headers[index] && headers[index].includes(expected.split(' ')[0]);
    });
    
    if (!matchesExpected) {
      throw new Error('Excel must have columns in order: Part Number, Description, Quantity');
    }
    
    const items = [];
    const originalHeaders = Object.keys(jsonData[0]);
    
    // Parse each row
    jsonData.forEach(row => {
      const partNumber = String(row[originalHeaders[0]] || '').trim();
      const description = String(row[originalHeaders[1]] || '').trim();
      const quantityStr = row[originalHeaders[2]];
      
      // Skip if Part Number is empty
      if (!partNumber) return;
      
      const quantity = parseInt(quantityStr);
      
      // Only add if quantity is a valid number
      if (!isNaN(quantity) && quantity > 0) {
        items.push({
          partNumber: partNumber,
          description: description,
          quantity: quantity
        });
      }
    });
    
    return {
      items,
      showInfo: { name: null, date: null },
      fileName: file.name
    };
  } catch (error) {
    console.error('Error parsing shoot list Excel:', error);
    throw new Error('Failed to parse shoot list Excel: ' + error.message);
  }
};

# Multi-Vendor Invoice Parser Architecture

## Overview
The system supports multiple fireworks vendors with different invoice formats through a modular parser architecture.

## Current Vendors
- **Wisley Pyrotechnics** (PDF, Excel)

## How It Works

### 1. Vendor Detection (Automatic)
When a PDF is uploaded, the system:
1. Extracts text using `pdftotext`
2. Searches for vendor-specific patterns (company name, address)
3. Routes to the appropriate parser

### 2. Vendor-Specific Parsers
Each vendor has a dedicated parser in `server/parsers/`:
- `wisleyPdfParser.js` - Handles Wisley PDF format
- More parsers can be added here

### 3. Fallback (Manual Selection)
If auto-detection fails, the frontend can:
- Show a vendor dropdown
- Re-upload with explicit vendor selection

## Adding a New Vendor

### Step 1: Create Parser
Create `server/parsers/newVendorPdfParser.js`:

```javascript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function parseNewVendorPDF(pdfPath) {
  const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
  const lines = stdout.split('\n');
  const items = [];
  
  // Parse according to this vendor's format
  for (const line of lines) {
    const item = parseNewVendorLine(line);
    if (item) items.push(item);
  }
  
  return items;
}

function parseNewVendorLine(line) {
  // Vendor-specific parsing logic
  // Must return: { partNumber, description, quantity, cost }
  return null;
}
```

### Step 2: Add Detection Pattern
Edit `server/vendorDetector.js`:

```javascript
export async function detectVendor(pdfPath) {
  const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
  const text = stdout.toLowerCase();
  
  if (text.includes('wisley pyrotechnics')) {
    return 'wisley';
  }
  
  // Add new vendor
  if (text.includes('new vendor name') || text.includes('unique address')) {
    return 'new-vendor';
  }
  
  return null;
}

export function getSupportedVendors() {
  return [
    { id: 'wisley', name: 'Wisley Pyrotechnics', formats: ['pdf', 'xlsx'] },
    { id: 'new-vendor', name: 'New Vendor Name', formats: ['pdf'] }
  ];
}
```

### Step 3: Register Parser
Edit `server/parsers/index.js`:

```javascript
import { parseWisleyPDF } from './wisleyPdfParser.js';
import { parseNewVendorPDF } from './newVendorPdfParser.js';

export async function parsePDF(pdfPath, vendorHint = null) {
  const vendor = vendorHint || await detectVendor(pdfPath);
  
  switch (vendor) {
    case 'wisley':
      return await parseWisleyPDF(pdfPath);
    case 'new-vendor':
      return await parseNewVendorPDF(pdfPath);
    default:
      throw new Error(`Unsupported vendor: ${vendor}`);
  }
}
```

### Step 4: Add Excel Parser (Optional)
Edit `src/utils/vendorParsers.js`:

```javascript
export const parseNewVendorExcel = (file) => {
  // Similar to parseWisleyExcel but with vendor-specific column positions
};
```

## Testing a New Parser

1. Get sample invoice from vendor
2. Run `pdftotext -layout invoice.pdf -` to see text layout
3. Identify column positions for: Product ID, Description, Quantity, Unit Price
4. Extract packing format pattern (e.g., "24/1", "9/1")
5. Calculate: total_items = quantity × packing, cost_per_item = unit_price ÷ packing
6. Test with `node server/checkTotal.js` (modify to use new parser)

## Key Parsing Principles

All parsers must return items in this format:
```javascript
{
  partNumber: string,    // Product/Part ID
  description: string,   // Item description (packing removed)
  quantity: number,      // Total individual pieces
  cost: number          // Cost per individual piece
}
```

### Packing Calculation
Most vendors show:
- **Quantity column** = number of cases/boxes
- **Packing** = X/Y (X items × Y inner packs)
- **Unit Price** = price per case

Formula:
- `total_pieces = quantity × (X × Y)`
- `cost_per_piece = unit_price ÷ (X × Y)`

## File Structure
```
server/
  ├── index.js                    # Main Express server
  ├── vendorDetector.js           # Auto-detection logic
  └── parsers/
      ├── index.js                # Parser dispatcher
      ├── wisleyPdfParser.js      # Wisley PDF parser
      └── [newVendor]PdfParser.js # Additional vendors

src/utils/
  └── vendorParsers.js            # Excel parsers (frontend)
```

## Future Enhancements
- [ ] UI dropdown for manual vendor selection
- [ ] Parser confidence scores (e.g., "90% sure this is Wisley")
- [ ] Parser test suite with sample invoices
- [ ] Support for more file formats (CSV with vendor-specific columns)
- [ ] Invoice validation (check subtotals match)

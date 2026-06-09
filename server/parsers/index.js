/**
 * Main PDF parser dispatcher
 * Routes to vendor-specific parsers based on detected vendor
 */

import { detectVendor } from '../vendorDetector.js';
import { parseWisleyPDF } from './wisleyPdfParser.js';
import { parseSpiritOf76PDF } from './spiritof76PdfParser.js';
import { parseAmericanWholesalePDF } from './americanwholesalePdfParser.js';

export async function parsePDF(pdfPath, vendorHint = null) {
  // Use vendor hint if provided, otherwise auto-detect
  const vendor = vendorHint || await detectVendor(pdfPath);
  
  if (!vendor) {
    throw new Error('Could not detect vendor. Please select vendor manually.');
  }
  
  // Route to appropriate parser
  switch (vendor) {
    case 'wisley':
      return await parseWisleyPDF(pdfPath);
    
    case 'spiritof76':
      return await parseSpiritOf76PDF(pdfPath);
    
    case 'americanwholesale':
      return await parseAmericanWholesalePDF(pdfPath);
    
    // Add more vendors here:
    // case 'other-vendor':
    //   return await parseOtherVendorPDF(pdfPath);
    
    default:
      throw new Error(`Unsupported vendor: ${vendor}`);
  }
}

/**
 * Parse PDF with explicit vendor selection
 */
export async function parsePDFWithVendor(pdfPath, vendorId) {
  return await parsePDF(pdfPath, vendorId);
}

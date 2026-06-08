import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Detect vendor from PDF content
 * Returns vendor name or null if unknown
 */
export async function detectVendor(pdfPath) {
  try {
    const { stdout } = await execFileAsync('pdftotext', ['-layout', pdfPath, '-']);
    const text = stdout.toLowerCase();
    
    // Check for Wisley Pyrotechnics
    if (text.includes('wisley pyrotechnics') || 
        text.includes('bedford, in 47421')) {
      return 'wisley';
    }
    
    // Add more vendors here
    // if (text.includes('other vendor name')) {
    //   return 'other-vendor';
    // }
    
    return null; // Unknown vendor
  } catch (error) {
    throw new Error(`Failed to detect vendor: ${error.message}`);
  }
}

/**
 * Get list of supported vendors
 */
export function getSupportedVendors() {
  return [
    {
      id: 'wisley',
      name: 'Wisley Pyrotechnics',
      formats: ['pdf', 'xlsx', 'xls']
    }
    // Add more vendors as they're implemented
    // {
    //   id: 'other-vendor',
    //   name: 'Other Vendor Name',
    //   formats: ['pdf']
    // }
  ];
}

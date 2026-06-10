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
    
    // Check for Spirit of 76
    if (text.includes("spirit of '76") ||
        text.includes('6401 w. highway 40') ||
        text.includes('6401 us-40') ||
        text.includes('columbia mo 65202') ||
        text.includes('columbia, mo, 65202') ||
        text.includes('(573) 447-1776') ||
        text.includes('boonville, mo, 65233')) {
      return 'spiritof76';
    }
    
    // Check for American Wholesale Fireworks
    if (text.includes('american wholesale fireworks') ||
        text.includes('7041 darrow road') ||
        text.includes('hudson oh 44236')) {
      return 'americanwholesale';
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
    },
    {
      id: 'spiritof76',
      name: 'Spirit of 76',
      formats: ['pdf']
    },
    {
      id: 'americanwholesale',
      name: 'American Wholesale Fireworks',
      formats: ['pdf']
    }
    // Add more vendors as they're implemented
    // {
    //   id: 'other-vendor',
    //   name: 'Other Vendor Name',
    //   formats: ['pdf']
    // }
  ];
}

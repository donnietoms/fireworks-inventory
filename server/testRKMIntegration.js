import { parsePDF } from './parsers/index.js';
import { detectVendor, getSupportedVendors } from './vendorDetector.js';

const pdfPath = '/Users/donnie_toms/Downloads/RKM Sales Order  RKM2205.pdf';

console.log('Testing RKM Integration with Backend\n');
console.log('='.repeat(60));

try {
  // Test 1: Check if RKM is in supported vendors list
  console.log('\n1. Checking Supported Vendors:');
  console.log('-'.repeat(60));
  const vendors = getSupportedVendors();
  const rkmVendor = vendors.find(v => v.id === 'rkm');
  
  if (rkmVendor) {
    console.log('✅ RKM Fireworks found in supported vendors');
    console.log(`   Name: ${rkmVendor.name}`);
    console.log(`   Formats: ${rkmVendor.formats.join(', ')}`);
  } else {
    console.log('❌ RKM Fireworks NOT found in supported vendors');
  }
  
  // Test 2: Auto-detect vendor
  console.log('\n2. Testing Auto-Detection:');
  console.log('-'.repeat(60));
  const detectedVendor = await detectVendor(pdfPath);
  console.log(`Detected vendor: ${detectedVendor}`);
  
  if (detectedVendor === 'rkm') {
    console.log('✅ Vendor auto-detection successful');
  } else {
    console.log(`❌ Expected 'rkm', got '${detectedVendor}'`);
  }
  
  // Test 3: Parse through main dispatcher (auto-detect)
  console.log('\n3. Testing Main Parser (Auto-detect):');
  console.log('-'.repeat(60));
  const result1 = await parsePDF(pdfPath);
  console.log(`✅ Parsed successfully`);
  console.log(`   Order: ${result1.orderInfo.orderNumber}`);
  console.log(`   Date: ${result1.orderInfo.orderDate}`);
  console.log(`   Items: ${result1.items.length}`);
  console.log(`   Total: $${result1.orderInfo.total.toFixed(2)}`);
  
  // Test 4: Parse with explicit vendor hint
  console.log('\n4. Testing Main Parser (Explicit vendor):');
  console.log('-'.repeat(60));
  const result2 = await parsePDF(pdfPath, 'rkm');
  console.log(`✅ Parsed successfully with explicit vendor`);
  console.log(`   Order: ${result2.orderInfo.orderNumber}`);
  console.log(`   Date: ${result2.orderInfo.orderDate}`);
  console.log(`   Items: ${result2.items.length}`);
  console.log(`   Total: $${result2.orderInfo.total.toFixed(2)}`);
  
  // Test 5: Verify data integrity
  console.log('\n5. Data Integrity Verification:');
  console.log('-'.repeat(60));
  
  const expectedData = {
    orderNumber: 'RKM2205',
    orderDate: '2024-05-15',
    itemCount: 9,
    total: 1164.89,
    firstItem: {
      partNumber: 'NO-300X-S001',
      lineTotal: 143.99
    }
  };
  
  const checks = [
    { 
      name: 'Order Number', 
      pass: result1.orderInfo.orderNumber === expectedData.orderNumber,
      value: result1.orderInfo.orderNumber
    },
    { 
      name: 'Order Date', 
      pass: result1.orderInfo.orderDate === expectedData.orderDate,
      value: result1.orderInfo.orderDate
    },
    { 
      name: 'Item Count', 
      pass: result1.items.length === expectedData.itemCount,
      value: result1.items.length
    },
    { 
      name: 'Total Amount', 
      pass: result1.orderInfo.total === expectedData.total,
      value: `$${result1.orderInfo.total.toFixed(2)}`
    },
    { 
      name: 'First Item Part Number', 
      pass: result1.items[0].partNumber === expectedData.firstItem.partNumber,
      value: result1.items[0].partNumber
    },
    { 
      name: 'First Item Total', 
      pass: result1.items[0].lineTotal === expectedData.firstItem.lineTotal,
      value: `$${result1.items[0].lineTotal.toFixed(2)}`
    }
  ];
  
  for (const check of checks) {
    const status = check.pass ? '✅' : '❌';
    console.log(`${status} ${check.name}: ${check.value}`);
  }
  
  // Summary
  const allPassed = checks.every(c => c.pass);
  
  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED - RKM Integration Complete!');
  } else {
    console.log('❌ Some tests failed');
  }
  console.log('='.repeat(60));
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

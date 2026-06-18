import { parseRKMPDF } from './parsers/rkmPdfParser.js';
import { detectVendor } from './vendorDetector.js';

const pdfPath = '/Users/donnie_toms/Downloads/RKM Sales Order  RKM2205.pdf';

console.log('Testing RKM PDF Parser\n');
console.log('='.repeat(60));

try {
  // Test vendor detection
  console.log('\n1. Testing Vendor Detection:');
  console.log('-'.repeat(60));
  const detectedVendor = await detectVendor(pdfPath);
  console.log(`Detected vendor: ${detectedVendor}`);
  
  if (detectedVendor !== 'rkm') {
    console.log(`❌ ERROR: Expected 'rkm', got '${detectedVendor}'`);
  } else {
    console.log('✅ Vendor detection successful');
  }
  
  // Test parsing
  console.log('\n2. Testing PDF Parsing:');
  console.log('-'.repeat(60));
  const result = await parseRKMPDF(pdfPath);
  
  // Display order info
  console.log('\nOrder Information:');
  console.log(`  Order Number: ${result.orderInfo.orderNumber}`);
  console.log(`  Order Date: ${result.orderInfo.orderDate}`);
  console.log(`  Subtotal: $${result.orderInfo.subtotal.toFixed(2)}`);
  console.log(`  Total: $${result.orderInfo.total.toFixed(2)}`);
  console.log(`  Number of items: ${result.items.length}`);
  
  // Verify expected values
  console.log('\n3. Verification:');
  console.log('-'.repeat(60));
  const checks = [
    { name: 'Order Number', expected: 'RKM2205', actual: result.orderInfo.orderNumber },
    { name: 'Order Date', expected: '2024-05-15', actual: result.orderInfo.orderDate },
    { name: 'Item Count', expected: 9, actual: result.items.length },
    { name: 'Subtotal', expected: 1164.89, actual: result.orderInfo.subtotal }
  ];
  
  for (const check of checks) {
    const match = check.expected == check.actual;
    const status = match ? '✅' : '❌';
    console.log(`${status} ${check.name}: expected ${check.expected}, got ${check.actual}`);
  }
  
  // Display first 3 items
  console.log('\n4. First 3 Items:');
  console.log('-'.repeat(60));
  for (let i = 0; i < Math.min(3, result.items.length); i++) {
    const item = result.items[i];
    console.log(`\nItem ${i + 1}:`);
    console.log(`  Part Number: ${item.partNumber}`);
    console.log(`  Description: ${item.description}`);
    console.log(`  Cases: ${item.cases}`);
    console.log(`  Packing: ${item.packing ? `${item.packagesPerCase}/${item.itemsPerPackage}` : 'Unknown'}`);
    console.log(`  Total Items: ${item.quantity || 'N/A'}`);
    console.log(`  Cost per Item: ${item.cost ? `$${item.cost.toFixed(2)}` : 'N/A'}`);
    console.log(`  Line Total: $${item.lineTotal.toFixed(2)}`);
  }
  
  // Display all items summary
  console.log('\n5. All Items Summary:');
  console.log('-'.repeat(60));
  console.log('Part Number'.padEnd(20) + 'Description'.padEnd(40) + 'Qty'.padEnd(8) + 'Total');
  console.log('-'.repeat(80));
  for (const item of result.items) {
    const partNum = item.partNumber.substring(0, 19).padEnd(20);
    const desc = item.description.substring(0, 39).padEnd(40);
    const qty = (item.quantity || 'N/A').toString().padEnd(8);
    const total = `$${item.lineTotal.toFixed(2)}`;
    console.log(partNum + desc + qty + total);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed successfully!');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

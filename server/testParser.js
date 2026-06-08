import { parseWisleyPDF } from './parsers/wisleyPdfParser.js';

try {
  const result = await parseWisleyPDF('/Users/donnie_toms/Downloads/Sale 101628.pdf');
  console.log('Items parsed:', result.items?.length || 0);
  console.log('Order info:', JSON.stringify(result.orderInfo, null, 2));
  
  if (result.items && result.items.length > 0) {
    console.log('\nFirst 3 items:');
    result.items.slice(0, 3).forEach(item => {
      console.log(`  ${item.partNumber}: ${item.quantity} @ $${item.cost}`);
    });
  }
} catch (error) {
  console.error('Parse error:', error.message);
  console.error(error.stack);
}

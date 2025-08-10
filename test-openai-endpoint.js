const fs = require('fs');
const path = require('path');

async function testEndpoint() {
  try {
    // Use the test PDF that we know works
    const testPdfPath = path.join(__dirname, 'node_modules/pdf-parse/test/data/04-valid.pdf');
    
    if (!fs.existsSync(testPdfPath)) {
      console.error('Test PDF not found');
      return;
    }
    
    const pdfBuffer = fs.readFileSync(testPdfPath);
    const file = new File([pdfBuffer], 'test-proposal.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Testing /api/parse-proposal-openai endpoint...');
    console.log('File size:', pdfBuffer.length, 'bytes');
    
    const response = await fetch('http://localhost:3000/api/parse-proposal-openai', {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('\nExtracted data:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('\n❌ Error:', result.error);
      if (result.details) console.error('Details:', result.details);
    } else {
      console.log('\n✅ SUCCESS! Data extracted from PDF');
      console.log('Key fields found:');
      console.log('- PO Number:', result.po_number);
      console.log('- Customer:', result.customer_company);
      console.log('- Square Footage:', result.square_footage);
      console.log('- Total:', result.total);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Start dev server first
console.log('Make sure dev server is running: npm run dev');
console.log('Testing in 3 seconds...\n');
setTimeout(testEndpoint, 3000);
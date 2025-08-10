const fs = require('fs');
const path = require('path');

async function testParse() {
  try {
    // Create a simple test PDF content
    const testPdfPath = path.join(__dirname, 'test-pdfs', 'Ararat Convalescent Hospital.pdf');
    
    if (!fs.existsSync(testPdfPath)) {
      console.error('Test PDF not found at:', testPdfPath);
      return;
    }

    const file = fs.readFileSync(testPdfPath);
    const blob = new Blob([file], { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', blob, 'Ararat Convalescent Hospital.pdf');

    console.log('Testing parse-proposal endpoint...');
    const response = await fetch('http://localhost:3000/api/parse-proposal', {
      method: 'POST',
      body: formData
    });

    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response body:', text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\nParsed data:');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testParse();
const fs = require('fs');
const path = require('path');

async function testOpenAIUpload() {
  try {
    // Use one of the test PDFs from node_modules
    const testPdfPath = path.join(__dirname, 'node_modules/pdf-parse/test/data/04-valid.pdf');
    
    if (!fs.existsSync(testPdfPath)) {
      console.error('Test PDF not found');
      return;
    }
    
    const pdfBuffer = fs.readFileSync(testPdfPath);
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', blob, 'test.pdf');
    
    console.log('Testing OpenAI upload endpoint...');
    console.log('File size:', pdfBuffer.length, 'bytes');
    
    const response = await fetch('http://localhost:3000/api/parse-proposal-openai', {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', response.status);
    
    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Make sure dev server is running
console.log('Make sure dev server is running on port 3000...');
setTimeout(testOpenAIUpload, 2000);
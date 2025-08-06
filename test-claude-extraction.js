const fs = require('fs');
const path = require('path');

// Load env vars
require('dotenv').config({ path: '.env.local' });

async function testClaude() {
  console.log('Testing Claude extraction with Ararat PDF...\n');
  
  const pdfPath = '/Users/ryanbrazzell/Desktop/Ararat Convalescent Hospital.pdf';
  
  try {
    // Read the PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log('PDF loaded, size:', pdfBuffer.length);
    
    // Create form data
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, 'test.pdf');
    
    // Test the endpoint
    console.log('Calling extract-claude endpoint...');
    const response = await fetch('http://localhost:3000/api/extract-claude', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if running locally
if (typeof window === 'undefined') {
  testClaude();
}
const fs = require('fs');
const path = require('path');

async function testAraratPDF() {
  try {
    // Use the actual Ararat PDF
    const pdfPath = '/Users/ryanbrazzell/Desktop/Ararat Convalescent Hospital.pdf';
    
    if (!fs.existsSync(pdfPath)) {
      console.error('Ararat PDF not found at:', pdfPath);
      return;
    }
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    const file = new File([pdfBuffer], 'Ararat Convalescent Hospital.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Testing with Ararat Convalescent Hospital PDF...');
    console.log('File size:', (pdfBuffer.length / 1024 / 1024).toFixed(2), 'MB');
    
    const response = await fetch('http://localhost:3000/api/parse-proposal-openai', {
      method: 'POST',
      body: formData
    });
    
    console.log('Response status:', response.status);
    
    const result = await response.json();
    
    if (result.error) {
      console.error('\n❌ Error:', result.error);
      if (result.details) console.error('Details:', result.details);
    } else {
      console.log('\n✅ SUCCESS! Data extracted from Ararat PDF:');
      console.log('=====================================');
      console.log('Customer:', result.customer_company);
      console.log('Contact:', result.customer_first_name, result.customer_last_name);
      console.log('Phone:', result.customer_phone);
      console.log('Email:', result.customer_email);
      console.log('Square Footage:', result.square_footage);
      console.log('Service Type:', result.service_type);
      console.log('Unit Price:', result.unit_price);
      console.log('Subtotal:', result.subtotal);
      console.log('Total:', result.total);
      console.log('Project Address:', result.project_address);
      console.log('City:', result.city);
      console.log('State:', result.state);
      console.log('ZIP:', result.zip);
      console.log('=====================================');
      console.log('\nFull extracted data:');
      console.log(JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Make sure dev server is running
console.log('Make sure dev server is running: npm run dev');
console.log('Testing in 3 seconds...\n');
setTimeout(testAraratPDF, 3000);
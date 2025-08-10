const fs = require('fs');

async function testFullWorkflow() {
  try {
    console.log('Testing complete workflow: PDF upload → extraction → PO generation\n');
    
    // Step 1: Upload and extract from Ararat PDF
    console.log('Step 1: Uploading Ararat PDF for extraction...');
    const pdfPath = '/Users/ryanbrazzell/Desktop/Ararat Convalescent Hospital.pdf';
    const pdfBuffer = fs.readFileSync(pdfPath);
    const file = new File([pdfBuffer], 'Ararat Convalescent Hospital.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('file', file);
    
    const extractResponse = await fetch('http://localhost:3000/api/parse-proposal-openai', {
      method: 'POST',
      body: formData
    });
    
    if (!extractResponse.ok) {
      throw new Error(`Extraction failed: ${extractResponse.status}`);
    }
    
    const extractedData = await extractResponse.json();
    console.log('✅ Data extracted successfully');
    console.log('Customer:', extractedData.customer_company);
    console.log('Square Footage:', extractedData.square_footage);
    console.log('Total:', extractedData.total || extractedData.subtotal);
    
    // Step 2: Generate PO from extracted data
    console.log('\nStep 2: Generating Purchase Order...');
    
    // Add some adjustments (simulating user edits)
    const poData = {
      ...extractedData,
      po_number: `PO-${Date.now()}`,
      po_date: new Date().toLocaleDateString(),
      notes: 'Generated from Ararat Convalescent Hospital proposal. Please confirm all details before proceeding.'
    };
    
    const poResponse = await fetch('http://localhost:3000/api/generate-po', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(poData)
    });
    
    if (!poResponse.ok) {
      throw new Error(`PO generation failed: ${poResponse.status}`);
    }
    
    const pdfBlob = await poResponse.arrayBuffer();
    const finalPdf = Buffer.from(pdfBlob);
    
    const outputFilename = `Ararat-PO-${poData.po_number}.pdf`;
    fs.writeFileSync(outputFilename, finalPdf);
    
    console.log(`✅ Purchase Order generated successfully!`);
    console.log(`📄 Saved as: ${outputFilename}`);
    console.log(`📏 Size: ${(finalPdf.length / 1024).toFixed(2)} KB`);
    
    console.log('\n🎉 FULL WORKFLOW TEST PASSED!');
    console.log('The system successfully:');
    console.log('1. Uploaded the Ararat PDF');
    console.log('2. Extracted all relevant data using OpenAI');
    console.log('3. Generated a professional Purchase Order PDF');
    console.log('4. Made it ready for download');
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error);
  }
}

// Run test
console.log('Make sure dev server is running: npm run dev');
console.log('Starting test in 3 seconds...\n');
setTimeout(testFullWorkflow, 3000);
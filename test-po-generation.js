const fs = require('fs');

async function testPOGeneration() {
  try {
    // Sample data from Ararat extraction
    const sampleData = {
      po_date: "01/10/2025",
      po_number: "PO-TEST-001",
      customer_first_name: "Jack",
      customer_last_name: "Walker",
      customer_company: "Ararat Convalescent Hospital",
      onsite_contact_name: "Jack Walker",
      onsite_contact_phone: "(323) 256-8012",
      customer_phone: "(323) 256-8012",
      customer_email: "jackw@ararathome.org",
      billing_address: "2373 Colorado Boulevard",
      project_address: "2373 Colorado Boulevard, Los Angeles, CA 90041",
      city: "Los Angeles",
      state: "CA",
      zip: "90041",
      service_type: "VCT Strip and Wax",
      floor_type: "VCT",
      square_footage: "8604",
      unit_price: "1.25",
      subtotal: "10755.00",
      tax: "967.95",
      total: "11722.95",
      timeline: "2-3 days",
      requested_service_date: "01/20/2025",
      special_requirements: "Work must be performed after hours. Use hospital-grade products.",
      doc_reference: "JSGD9-9CN7V-4YTVN-UG3QB",
      notes: "Please coordinate with facility manager before starting work."
    };
    
    console.log('Testing PO generation with sample data...');
    
    const response = await fetch('http://localhost:3000/api/generate-po', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sampleData)
    });
    
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const pdfBuffer = Buffer.from(buffer);
      
      // Save PDF to file for inspection
      const filename = 'test-purchase-order.pdf';
      fs.writeFileSync(filename, pdfBuffer);
      
      console.log(`✅ SUCCESS! PDF generated and saved as ${filename}`);
      console.log(`File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      
      // Also test with minimal data
      console.log('\nTesting with minimal data...');
      const minimalData = {
        customer_company: "Test Company",
        service_type: "Floor Service",
        square_footage: "1000",
        total: "500.00"
      };
      
      const response2 = await fetch('http://localhost:3000/api/generate-po', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(minimalData)
      });
      
      if (response2.ok) {
        const buffer2 = await response2.arrayBuffer();
        fs.writeFileSync('test-minimal-po.pdf', Buffer.from(buffer2));
        console.log('✅ Minimal PO also generated successfully');
      }
      
    } else {
      const error = await response.text();
      console.error('❌ Failed to generate PDF:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Make sure dev server is running
console.log('Make sure dev server is running: npm run dev');
console.log('Testing in 3 seconds...\n');
setTimeout(testPOGeneration, 3000);
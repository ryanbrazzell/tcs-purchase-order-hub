// Test script to verify mock API functionality
const fs = require('fs');
const path = require('path');

async function testMockAPI() {
  console.log('Testing Mock PDF extraction API...\n');
  
  // Test the GET endpoint first
  try {
    console.log('1. Testing GET endpoint for mock API...');
    const getResponse = await fetch('http://localhost:3000/api/extract-mock');
    const getData = await getResponse.json();
    console.log('GET response:', JSON.stringify(getData, null, 2));
    console.log('\n');
  } catch (error) {
    console.error('GET endpoint error:', error.message);
  }
  
  // Test the POST endpoint with a dummy file
  try {
    console.log('2. Testing POST endpoint for mock API...');
    
    // Create a simple test file in memory
    const blob = new Blob(['Test PDF content'], { type: 'application/pdf' });
    const file = new File([blob], 'test.pdf', { type: 'application/pdf' });
    
    const formData = new FormData();
    formData.append('pdf', file);
    
    const postResponse = await fetch('http://localhost:3000/api/extract-mock', {
      method: 'POST',
      body: formData
    });
    
    const postData = await postResponse.json();
    console.log('POST response:', JSON.stringify(postData, null, 2));
    console.log('\n');
    
    if (postData.success) {
      console.log('✅ Mock API is working correctly!');
      console.log('Extracted data includes:');
      console.log('- Customer:', postData.data.customer_information.company_name);
      console.log('- Line items:', postData.data.line_items.length);
      console.log('- Total:', postData.data.totals.total);
    }
  } catch (error) {
    console.error('POST endpoint error:', error);
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Make sure your server is running: npm run dev');
  console.log('2. Visit http://localhost:3000');
  console.log('3. Upload any PDF - it will return mock data');
  console.log('4. Once this works, we can implement real extraction');
}

// Run the test
testMockAPI().catch(console.error);
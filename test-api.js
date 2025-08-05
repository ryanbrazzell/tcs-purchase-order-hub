// Test script to verify API functionality
const fs = require('fs');
const path = require('path');

async function testAPI() {
  console.log('Testing PDF extraction API...\n');
  
  // Create a simple test PDF content
  const testPdfContent = `
    CUSTOMER PROPOSAL
    
    Customer Information:
    Company: ABC Corporation
    Contact: John Smith
    Email: john@abc.com
    Phone: 555-123-4567
    Job Location: 123 Main St, City, State 12345
    Onsite Contact: Jane Doe
    Onsite Phone: 555-987-6543
    
    Job Details:
    Service Date: 2024-12-01
    Square Footage: 5000
    Floor Type: Concrete
    Description: Floor cleaning and sealing service
    
    Line Items:
    Floor Cleaning - 5000 sq ft @ $0.50 = $2500.00
    Floor Sealing - 5000 sq ft @ $0.75 = $3750.00
    
    Total: $6250.00
  `;
  
  // For this test, we'll use a minimal PDF
  console.log('Testing with text content:', testPdfContent.substring(0, 100) + '...\n');
  
  // Test the debug endpoint first
  try {
    console.log('1. Testing debug endpoint...');
    const debugResponse = await fetch('http://localhost:3000/api/debug');
    const debugData = await debugResponse.json();
    console.log('Debug response:', JSON.stringify(debugData, null, 2));
    console.log('\n');
  } catch (error) {
    console.error('Debug endpoint error:', error.message);
  }
  
  // Test environment variables
  console.log('2. Environment check:');
  console.log('ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
  console.log('API Key length:', process.env.ANTHROPIC_API_KEY?.length);
  console.log('\n');
  
  console.log('To test the actual PDF extraction:');
  console.log('1. Make sure your local server is running: npm run dev');
  console.log('2. Visit http://localhost:3000');
  console.log('3. Upload a PDF and check the browser console for errors');
  console.log('4. Check the terminal running npm run dev for server logs');
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

testAPI().catch(console.error);
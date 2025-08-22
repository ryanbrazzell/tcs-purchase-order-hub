/**
 * Test specifically what the PDF text extraction is returning
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/parse-proposal-combined';
const PDF_PATH = path.join(__dirname, 'test-proposal.pdf');

async function testPDFContentExtraction() {
  console.log('🔍 Testing PDF Text Extraction Step by Step\n');
  
  if (!fs.existsSync(PDF_PATH)) {
    console.error('❌ test-proposal.pdf not found');
    return;
  }
  
  console.log(`📄 Testing with: ${path.basename(PDF_PATH)}`);
  console.log(`📊 File size: ${fs.statSync(PDF_PATH).size} bytes`);
  console.log('\nExpected PDF content includes:');
  console.log('  • Company: Meridian Business Center LLC');
  console.log('  • Service: Floor Stripping and Waxing');
  console.log('  • Square Footage: 4,500 sq ft');
  console.log('  • Total: $4,250.00');
  console.log('  • City: Atlanta, GA');
  console.log('\n🚀 Making request to API with detailed logging...\n');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(PDF_PATH), {
    filename: 'test-proposal.pdf',
    contentType: 'application/pdf'
  });
  
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      body: formData,
      timeout: 120000
    });
    
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}\n`);
    
    if (response.status !== 200) {
      console.error('❌ Request failed:', data);
      return;
    }
    
    console.log('🔍 Detailed Analysis:\n');
    
    // Check if expected Meridian data is present
    const expectedData = {
      customer_company: 'Meridian Business Center',
      service_type: 'Floor Stripping and Waxing',
      square_footage: '4500',
      total: '4250',
      city: 'Atlanta',
      state: 'GA'
    };
    
    console.log('📋 Expected vs Actual Data Comparison:');
    let hasCorrectData = true;
    
    Object.entries(expectedData).forEach(([field, expected]) => {
      const actual = data[field] || '';
      const matches = actual.toLowerCase().includes(expected.toLowerCase());
      const status = matches ? '✅' : '❌';
      
      console.log(`  ${status} ${field}:`);
      console.log(`      Expected: "${expected}"`);
      console.log(`      Actual: "${actual}"`);
      console.log(`      Matches: ${matches}\n`);
      
      if (!matches) hasCorrectData = false;
    });
    
    console.log('🔍 DIAGNOSIS:');
    if (hasCorrectData) {
      console.log('  ✅ PDF extraction is working correctly');
      console.log('  ✅ OpenAI is reading the actual PDF content');
    } else {
      console.log('  ❌ CRITICAL ISSUE: PDF extraction is NOT reading the actual file');
      console.log('  ❌ OpenAI Assistants API is returning incorrect/placeholder data');
      console.log('  ❌ The file upload or text extraction step is broken');
      
      console.log('\n🔧 REQUIRED FIXES:');
      console.log('  1. Fix OpenAI Assistants API file upload');
      console.log('  2. Fix text extraction from uploaded PDF');
      console.log('  3. Ensure PDF content is actually being read');
      console.log('  4. Fix the data extraction prompt to use actual PDF text');
    }
    
    // Show some extracted data to understand what's happening
    console.log('\n📝 Sample of Extracted Data:');
    console.log(`  Customer Company: "${data.customer_company}"`);
    console.log(`  Service Type: "${data.service_type}"`);
    console.log(`  Square Footage: "${data.square_footage}"`);
    console.log(`  Total: "${data.total}"`);
    console.log(`  Project Address: "${data.project_address}"`);
    console.log(`  City: "${data.city}"`);
    console.log(`  State: "${data.state}"`);
    
    console.log('\n📊 Debug Info:');
    if (data._debug) {
      console.log(`  Request ID: ${data._debug.requestId}`);
      console.log(`  PDF Processed: ${data._debug.processing?.pdfProcessed}`);
      console.log(`  Fields Extracted: ${data._debug.processing?.fieldsExtracted}`);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the test
testPDFContentExtraction().catch(error => {
  console.error('Fatal error:', error);
});
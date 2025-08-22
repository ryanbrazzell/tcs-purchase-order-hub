/**
 * Debug script to test PDF extraction specifically
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/parse-proposal-combined';
const PDF_PATH = path.join(__dirname, 'test-proposal.pdf');

async function debugPDFExtraction() {
  console.log('🔍 Debugging PDF Extraction Process\n');
  
  if (!fs.existsSync(PDF_PATH)) {
    console.error('❌ test-proposal.pdf not found');
    return;
  }
  
  console.log(`📄 Testing with: ${path.basename(PDF_PATH)}`);
  console.log(`📊 File size: ${fs.statSync(PDF_PATH).size} bytes\n`);
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(PDF_PATH), {
    filename: 'test-proposal.pdf',
    contentType: 'application/pdf'
  });
  
  console.log('🚀 Making request to API...\n');
  
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      body: formData,
      timeout: 120000 // 2 minute timeout
    });
    
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
    console.log('\n🔍 Debug Information:');
    
    if (data._debug) {
      console.log('  Request ID:', data._debug.requestId);
      console.log('  Processing Info:', data._debug.processing);
    }
    
    console.log('\n📝 Extracted Fields Summary:');
    const extractedFields = [];
    const emptyFields = [];
    
    Object.keys(data).forEach(field => {
      if (field.startsWith('_')) return; // Skip debug fields
      
      const value = data[field];
      if (value && value.trim().length > 0) {
        extractedFields.push(field);
        console.log(`  ✅ ${field}: "${value}"`);
      } else {
        emptyFields.push(field);
      }
    });
    
    console.log(`\n📊 Extraction Statistics:`);
    console.log(`  Fields with data: ${extractedFields.length}`);
    console.log(`  Empty fields: ${emptyFields.length}`);
    console.log(`  Total fields: ${extractedFields.length + emptyFields.length}`);
    
    if (extractedFields.length === 0) {
      console.log('\n❌ CRITICAL ISSUE: No data extracted from PDF!');
      console.log('\nPossible causes:');
      console.log('  1. PDF text extraction failed');
      console.log('  2. OpenAI Assistants API not extracting text properly');
      console.log('  3. Data extraction prompt not working');
      console.log('  4. PDF format not supported by OpenAI');
      
      // Show raw response for debugging
      console.log('\n🔍 Raw Response (first 1000 chars):');
      console.log(JSON.stringify(data, null, 2).substring(0, 1000));
    } else {
      console.log('\n✅ PDF extraction is working but may be incomplete');
    }
    
    if (emptyFields.length > 0 && emptyFields.length < 10) {
      console.log('\n📋 Empty fields:');
      emptyFields.forEach(field => console.log(`  • ${field}`));
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('   Error details:', error.code || 'Unknown error');
  }
}

// Run the debug test
debugPDFExtraction().catch(error => {
  console.error('Fatal error:', error);
});
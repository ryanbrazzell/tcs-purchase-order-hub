/**
 * Simple PDF API test to diagnose the parsing issue
 */

const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testPDFAPI() {
  console.log('🔍 Diagnosing PDF API parsing issue...');
  
  // Test with the working PDF we know parses correctly
  const pdfPath = './test-proposal.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ test-proposal.pdf not found');
    return;
  }
  
  console.log('📄 Testing with test-proposal.pdf...');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(pdfPath), {
    filename: 'test-proposal.pdf',
    contentType: 'application/pdf'
  });
  
  try {
    const response = await fetch('http://localhost:3000/api/parse-proposal-combined', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 200) {
      console.log('✅ PDF API test PASSED');
      console.log('🎯 Extracted Data Preview:');
      console.log('   Customer Company:', data.customer_company || '[not found]');
      console.log('   Service Type:', data.service_type || '[not found]');
      console.log('   Square Footage:', data.square_footage || '[not found]');
      console.log('   Total:', data.total || '[not found]');
      console.log('   Request ID:', data._debug?.requestId || '[no debug info]');
      console.log('   Fields Count:', Object.keys(data).filter(k => !k.startsWith('_')).length);
    } else {
      console.log('❌ PDF API test FAILED');
      console.log('Error:', data.error);
      console.log('Details:', data.details);
      if (data.debugInfo) {
        console.log('Debug Info:', data.debugInfo);
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Also test the simple PDF parsing API for comparison
async function testSimplePDFAPI() {
  console.log('\n🔍 Testing simple PDF parsing API for comparison...');
  
  const pdfPath = './test-proposal.pdf';
  const formData = new FormData();
  formData.append('file', fs.createReadStream(pdfPath), {
    filename: 'test-proposal.pdf',
    contentType: 'application/pdf'
  });
  
  try {
    const response = await fetch('http://localhost:3000/api/simple-pdf-test', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    console.log('📊 Simple API Status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Simple PDF API works');
      console.log('   Text Length:', data.text?.length || 0);
      console.log('   Text Preview:', data.text?.substring(0, 100) || '[no text]');
    } else {
      console.log('❌ Simple PDF API failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Simple API request failed:', error.message);
  }
}

async function runDiagnostics() {
  await testPDFAPI();
  await testSimplePDFAPI();
}

runDiagnostics();
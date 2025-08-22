/**
 * Comprehensive test to verify PDF extraction is working as primary source
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/parse-proposal-combined';
const PDF_PATH = path.join(__dirname, 'test-proposal.pdf');

async function comprehensiveTest() {
  console.log('🔍 COMPREHENSIVE PDF EXTRACTION TEST');
  console.log('=====================================\n');
  
  if (!fs.existsSync(PDF_PATH)) {
    console.error('❌ test-proposal.pdf not found');
    return;
  }
  
  console.log('📋 Test Scope:');
  console.log('  1. PDF-only extraction');
  console.log('  2. Verify all expected fields are extracted from PDF');
  console.log('  3. Confirm PDF is the primary data source');
  console.log('  4. Check data quality and completeness\n');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(PDF_PATH), {
    filename: 'test-proposal.pdf',
    contentType: 'application/pdf'
  });
  
  console.log('🚀 Making PDF-only extraction request...\n');
  
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
      method: 'POST',
      body: formData,
      timeout: 120000
    });
    
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.status !== 200) {
      console.error('❌ Request failed:', data);
      return;
    }
    
    console.log('✅ PDF extraction successful!\n');
    
    // Analyze the extracted data
    const expectedPDFData = {
      'Customer Company': { field: 'customer_company', expected: 'Meridian Business Center', critical: true },
      'Contact Name': { field: 'onsite_contact_name', expected: 'Sarah Johnson', critical: true },
      'Customer Phone': { field: 'customer_phone', expected: '555-123-4567', critical: true },
      'Project Address': { field: 'project_address', expected: '1250 Corporate Drive', critical: true },
      'City': { field: 'city', expected: 'Atlanta', critical: true },
      'State': { field: 'state', expected: 'GA', critical: true },
      'ZIP Code': { field: 'zip', expected: '30309', critical: true },
      'Service Type': { field: 'service_type', expected: 'Floor Stripping and Waxing', critical: true },
      'Floor Type': { field: 'floor_type', expected: 'VCT', critical: true },
      'Square Footage': { field: 'square_footage', expected: '4500', critical: true },
      'Total Amount': { field: 'total', expected: '4250', critical: true },
      'Service Date': { field: 'requested_service_date', expected: 'weekend', critical: false },
      'Special Requirements': { field: 'special_requirements', expected: 'LEED certified', critical: false }
    };
    
    console.log('📋 PDF DATA EXTRACTION ANALYSIS:');
    console.log('==================================\n');
    
    let criticalMatches = 0;
    let totalCritical = 0;
    let allMatches = 0;
    let totalFields = 0;
    
    Object.entries(expectedPDFData).forEach(([label, { field, expected, critical }]) => {
      const actual = data[field] || '';
      const matches = actual.toLowerCase().includes(expected.toLowerCase());
      
      totalFields++;
      if (critical) totalCritical++;
      
      if (matches) {
        allMatches++;
        if (critical) criticalMatches++;
      }
      
      const status = matches ? '✅' : '❌';
      const criticalLabel = critical ? ' [CRITICAL]' : '';
      
      console.log(`${status} ${label}${criticalLabel}:`);
      console.log(`    Expected: "${expected}"`);
      console.log(`    Actual: "${actual}"`);
      console.log(`    Match: ${matches}\n`);
    });
    
    console.log('📊 EXTRACTION SUMMARY:');
    console.log('======================');
    console.log(`Critical Fields Extracted: ${criticalMatches}/${totalCritical} (${((criticalMatches/totalCritical)*100).toFixed(1)}%)`);
    console.log(`All Fields Extracted: ${allMatches}/${totalFields} (${((allMatches/totalFields)*100).toFixed(1)}%)`);
    
    // Check for empty fields
    const allFields = Object.keys(data).filter(key => !key.startsWith('_'));
    const populatedFields = allFields.filter(key => data[key] && data[key].toString().trim().length > 0);
    
    console.log(`Total Fields: ${allFields.length}`);
    console.log(`Populated Fields: ${populatedFields.length}`);
    console.log(`Empty Fields: ${allFields.length - populatedFields.length}`);
    
    console.log('\\n🎯 FINAL ASSESSMENT:');
    if (criticalMatches === totalCritical && allMatches >= totalFields * 0.8) {
      console.log('✅ PDF EXTRACTION WORKING PERFECTLY');
      console.log('   All critical data extracted correctly from PDF');
      console.log('   PDF is being used as the primary data source');
      console.log('   No issues detected with PDF processing');
    } else if (criticalMatches >= totalCritical * 0.8) {
      console.log('⚠️ PDF EXTRACTION MOSTLY WORKING');
      console.log('   Most critical data extracted from PDF');
      console.log('   Some formatting or minor extraction issues');
    } else {
      console.log('❌ PDF EXTRACTION HAS ISSUES');
      console.log('   Critical data missing or incorrect');
      console.log('   PDF processing may be broken');
    }
    
    console.log('\\n📋 Debug Information:');
    if (data._debug) {
      console.log(`   Request ID: ${data._debug.requestId}`);
      console.log(`   PDF Processed: ${data._debug.processing?.pdfProcessed}`);
      console.log(`   Voice Processed: ${data._debug.processing?.voiceProcessed}`);
      console.log(`   Fields Extracted: ${data._debug.processing?.fieldsExtracted}/${data._debug.processing?.totalFields}`);
    }
    
    // Show a few key extracted values
    console.log('\\n📝 Key Extracted Values:');
    console.log(`   Company: "${data.customer_company}"`);
    console.log(`   Service: "${data.service_type}"`);
    console.log(`   Address: "${data.project_address}"`);
    console.log(`   Total: "${data.total}"`);
    console.log(`   Doc Reference: "${data.doc_reference}"`);
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('   This indicates a server or network error');
  }
}

// Run the comprehensive test
comprehensiveTest().catch(error => {
  console.error('Fatal error:', error);
});
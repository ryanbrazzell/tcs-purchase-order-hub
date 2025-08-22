/**
 * Test PDF vs Voice data priority to see if voice is overriding PDF
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

// Configuration
const API_BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/parse-proposal-combined';
const PDF_PATH = path.join(__dirname, 'test-proposal.pdf');

function createTestVoiceFile() {
  // Create a test voice file with conflicting data
  const conflictingData = `
  This is a voice recording about a different job.
  The customer is XYZ Corporation, not Meridian.
  The service is carpet cleaning, not floor stripping.
  The total is $1000, not $4250.
  The location is Chicago, not Atlanta.
  `;
  return Buffer.from(conflictingData);
}

async function testVoicePriority() {
  console.log('🔍 Testing PDF vs Voice Data Priority\n');
  
  if (!fs.existsSync(PDF_PATH)) {
    console.error('❌ test-proposal.pdf not found');
    return;
  }
  
  console.log('📄 PDF contains:');
  console.log('  • Company: Meridian Business Center LLC');
  console.log('  • Service: Floor Stripping and Waxing');
  console.log('  • Total: $4,250.00');
  console.log('  • City: Atlanta, GA');
  
  console.log('\n🎤 Voice will contain CONFLICTING data:');
  console.log('  • Company: XYZ Corporation');
  console.log('  • Service: Carpet cleaning');
  console.log('  • Total: $1000');
  console.log('  • City: Chicago');
  
  console.log('\n🎯 Expected Result: PDF data should win (Meridian, Floor Stripping, $4250, Atlanta)');
  console.log('\n🚀 Testing...\n');
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(PDF_PATH), {
    filename: 'test-proposal.pdf',
    contentType: 'application/pdf'
  });
  
  // Add conflicting voice data
  const voiceData = createTestVoiceFile();
  formData.append('voice', voiceData, {
    filename: 'conflicting-voice.wav',
    contentType: 'audio/wav'
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
    
    console.log('🔍 Data Priority Test Results:\n');
    
    // Test key fields to see which data source won
    const tests = [
      {
        field: 'customer_company',
        pdfValue: 'Meridian Business Center',
        voiceValue: 'XYZ Corporation',
        actual: data.customer_company
      },
      {
        field: 'service_type',
        pdfValue: 'Floor Stripping and Waxing',
        voiceValue: 'Carpet cleaning',
        actual: data.service_type
      },
      {
        field: 'total',
        pdfValue: '4250',
        voiceValue: '1000',
        actual: data.total
      },
      {
        field: 'city',
        pdfValue: 'Atlanta',
        voiceValue: 'Chicago',
        actual: data.city
      }
    ];
    
    let pdfWins = 0;
    let voiceWins = 0;
    let unclear = 0;
    
    tests.forEach(test => {
      const matchesPDF = test.actual && test.actual.toLowerCase().includes(test.pdfValue.toLowerCase());
      const matchesVoice = test.actual && test.actual.toLowerCase().includes(test.voiceValue.toLowerCase());
      
      let result;
      if (matchesPDF && !matchesVoice) {
        result = '✅ PDF WINS';
        pdfWins++;
      } else if (matchesVoice && !matchesPDF) {
        result = '❌ VOICE WINS';
        voiceWins++;
      } else if (matchesPDF && matchesVoice) {
        result = '⚠️ BOTH MATCH';
        unclear++;
      } else {
        result = '❓ NEITHER MATCH';
        unclear++;
      }
      
      console.log(`  ${test.field}: ${result}`);
      console.log(`    PDF: "${test.pdfValue}"`);
      console.log(`    Voice: "${test.voiceValue}"`);
      console.log(`    Actual: "${test.actual}"`);
      console.log('');
    });
    
    console.log('📊 PRIORITY TEST SUMMARY:');
    console.log(`  PDF Priority Wins: ${pdfWins}/${tests.length}`);
    console.log(`  Voice Override Wins: ${voiceWins}/${tests.length}`);
    console.log(`  Unclear/Neither: ${unclear}/${tests.length}`);
    
    if (pdfWins === tests.length) {
      console.log('\n✅ CORRECT: PDF data is properly prioritized');
      console.log('   Voice is not overriding PDF content');
    } else if (voiceWins > 0) {
      console.log('\n❌ CRITICAL ISSUE: Voice data is overriding PDF content!');
      console.log('   The priority system is broken');
    } else {
      console.log('\n⚠️ MIXED RESULTS: Priority system may have issues');
    }
    
    console.log('\n📋 Debug Info:');
    if (data._debug && data._debug.processing) {
      console.log(`  PDF Processed: ${data._debug.processing.pdfProcessed}`);
      console.log(`  Voice Processed: ${data._debug.processing.voiceProcessed}`);
      console.log(`  Voice Error: ${data._debug.processing.voiceError ? 'Yes' : 'No'}`);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the test
testVoicePriority().catch(error => {
  console.error('Fatal error:', error);
});
/**
 * Check where Sarah Johnson contact info is being mapped
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE_URL = 'http://localhost:3000';
const API_ENDPOINT = '/api/parse-proposal-combined';
const PDF_PATH = path.join(__dirname, 'test-proposal.pdf');

async function checkFieldMapping() {
  console.log('🔍 FIELD MAPPING ANALYSIS');
  console.log('=========================\n');
  
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
    
    if (response.status !== 200) {
      console.error('❌ Request failed:', data);
      return;
    }
    
    console.log('📋 Looking for "Sarah Johnson" in all fields:\n');
    
    const contactFields = [
      'customer_first_name',
      'customer_last_name', 
      'onsite_contact_name',
      'customer_company',
      'subcontractor_contact'
    ];
    
    contactFields.forEach(field => {
      const value = data[field] || '';
      const hasSarah = value.toLowerCase().includes('sarah');
      const hasJohnson = value.toLowerCase().includes('johnson');
      const status = (hasSarah || hasJohnson) ? '✅' : '❌';
      
      console.log(`${status} ${field}: "${value}"`);
    });
    
    console.log('\\n📋 All customer/contact fields:\n');
    
    Object.keys(data).forEach(field => {
      if (field.includes('customer') || field.includes('contact') || field.includes('name')) {
        const value = data[field] || '';
        console.log(`  ${field}: "${value}"`);
      }
    });
    
    console.log('\\n📋 All populated fields containing names:\n');
    
    Object.keys(data).forEach(field => {
      const value = data[field] || '';
      if (value && (value.includes('Johnson') || value.includes('Sarah') || value.includes('Meridian'))) {
        console.log(`  ✅ ${field}: "${value}"`);
      }
    });
    
    console.log('\\n📊 ANALYSIS:');
    const hasFirstName = data.customer_first_name && data.customer_first_name.toLowerCase().includes('sarah');
    const hasLastName = data.customer_last_name && data.customer_last_name.toLowerCase().includes('johnson');
    const hasContactName = data.onsite_contact_name && data.onsite_contact_name.toLowerCase().includes('sarah');
    
    if (hasFirstName && hasLastName) {
      console.log('✅ Contact name correctly split into first/last name fields');
    } else if (hasContactName) {
      console.log('✅ Contact name in onsite_contact_name field');
    } else {
      console.log('❌ Contact name not found in expected fields');
      console.log('   May need to check extraction prompt or field mapping');
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

checkFieldMapping().catch(error => {
  console.error('Fatal error:', error);
});
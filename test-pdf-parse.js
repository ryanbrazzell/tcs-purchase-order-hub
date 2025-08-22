const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function testPDFParsing() {
  const files = ['sample.pdf', 'test-proposal.pdf'];
  
  for (const filename of files) {
    const filepath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filepath)) {
      console.log(`❌ ${filename}: File not found`);
      continue;
    }
    
    try {
      const buffer = fs.readFileSync(filepath);
      console.log(`📄 Testing ${filename} (${buffer.length} bytes)...`);
      
      const data = await pdfParse(buffer);
      console.log(`✅ ${filename}: Success`);
      console.log(`   Pages: ${data.numpages}`);
      console.log(`   Text length: ${data.text.length}`);
      console.log(`   Preview: ${data.text.substring(0, 200)}...`);
      console.log('');
    } catch (error) {
      console.log(`❌ ${filename}: Parse error - ${error.message}`);
      console.log('');
    }
  }
}

testPDFParsing();
const pdfParse = require('pdf-parse');
const fs = require('fs');

async function testSimpleTextPDF() {
  try {
    const data = await pdfParse(fs.readFileSync('simple-text.pdf'));
    console.log('Simple PDF text length:', data.text.length);
    console.log('Simple PDF text:', JSON.stringify(data.text));
  } catch (err) {
    console.error('Parse error:', err.message);
  }
}

testSimpleTextPDF();
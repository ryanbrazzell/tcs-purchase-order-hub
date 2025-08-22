const pdfParse = require('pdf-parse');
const fs = require('fs');

async function testWorkingPDF() {
  try {
    const data = await pdfParse(fs.readFileSync('working-proposal.pdf'));
    console.log('Working PDF text length:', data.text.length);
    console.log('Working PDF preview:', data.text.substring(0, 300));
    console.log('Success! PDF can be parsed');
  } catch (err) {
    console.error('Parse error:', err.message);
  }
}

testWorkingPDF();
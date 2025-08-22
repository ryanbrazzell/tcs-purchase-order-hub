/**
 * Creates a simple text-based PDF that should parse correctly
 * Using a different method to ensure text is extractable
 */

const fs = require('fs');

// Create a very simple PDF with embedded text that pdf-parse can read
function createSimpleTextPDF() {
  // Create a minimal PDF with actual text content
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(TCS Floor Service Proposal) Tj
0 -20 Td
(Customer: ABC Corporation) Tj
0 -20 Td
(Contact: John Smith) Tj
0 -20 Td
(Phone: 555-1234) Tj
0 -20 Td
(Service: VCT Floor Stripping and Waxing) Tj
0 -20 Td
(Square Footage: 5000 sq ft) Tj
0 -20 Td
(Total Cost: $2500.00) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000273 00000 n 
0000000526 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
593
%%EOF`;
  
  const outputPath = './simple-text.pdf';
  fs.writeFileSync(outputPath, pdfContent);
  
  console.log(`Created simple text PDF: ${outputPath}`);
  return outputPath;
}

if (require.main === module) {
  createSimpleTextPDF();
}

module.exports = { createSimpleTextPDF };
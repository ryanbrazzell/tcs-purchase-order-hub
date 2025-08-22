/**
 * Creates a simple working PDF to replace the corrupted sample.pdf
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

function createSimplePDF() {
  const doc = new PDFDocument();
  const outputPath = './sample-working.pdf';
  
  // Pipe to file
  doc.pipe(fs.createWriteStream(outputPath));
  
  // Add simple content that matches the original sample.pdf
  doc.fontSize(16).text('TCS Floor Service Proposal', 50, 50);
  doc.fontSize(12);
  
  doc.text('Customer: ABC Corporation', 50, 100);
  doc.text('Contact: John Smith', 50, 120);
  doc.text('Phone: 555-1234', 50, 140);
  doc.text('Service: VCT Floor Stripping and Waxing', 50, 160);
  doc.text('Square Footage: 5000 sq ft', 50, 180);
  doc.text('Total Cost: $2500.00', 50, 200);
  
  // Finalize
  doc.end();
  
  console.log(`Created simple working PDF: ${outputPath}`);
}

if (require.main === module) {
  createSimplePDF();
}

module.exports = { createSimplePDF };
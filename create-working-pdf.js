/**
 * Creates a working PDF using PDFKit with proper text embedding
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

function createWorkingPDF() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ compress: false }); // Disable compression to help with parsing
    const outputPath = './working-proposal.pdf';
    
    // Pipe to file
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);
    
    // Add content with proper font and structure
    doc.font('Helvetica');
    doc.fontSize(20);
    doc.text('TCS FLOOR SERVICE PROPOSAL', 50, 50);
    
    doc.fontSize(12);
    doc.text(''); // Add some space
    
    // Customer Information
    doc.text('CUSTOMER INFORMATION:', 50, 120);
    doc.text('Customer: ABC Corporation', 50, 140);
    doc.text('Contact: John Smith', 50, 155);
    doc.text('Phone: 555-1234', 50, 170);
    doc.text('Email: john.smith@abc.com', 50, 185);
    
    // Service Details
    doc.text('SERVICE DETAILS:', 50, 220);
    doc.text('Service Type: VCT Floor Stripping and Waxing', 50, 240);
    doc.text('Floor Type: Vinyl Composite Tile', 50, 255);
    doc.text('Square Footage: 5000 sq ft', 50, 270);
    doc.text('Location: Main Office Building', 50, 285);
    
    // Pricing
    doc.text('PRICING:', 50, 320);
    doc.text('Floor Stripping: $1500.00', 50, 340);
    doc.text('Floor Waxing: $1000.00', 50, 355);
    doc.text('Total Cost: $2500.00', 50, 370);
    
    // Contact
    doc.text('CONTACT INFORMATION:', 50, 410);
    doc.text('TCS Floor Service', 50, 430);
    doc.text('Phone: (555) 987-6543', 50, 445);
    
    // Finalize
    doc.end();
    
    stream.on('finish', () => {
      console.log(`Created working PDF: ${outputPath}`);
      resolve(outputPath);
    });
    
    stream.on('error', reject);
  });
}

if (require.main === module) {
  createWorkingPDF().catch(console.error);
}

module.exports = { createWorkingPDF };
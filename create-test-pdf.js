/**
 * Creates a more comprehensive test PDF for API testing
 * Usage: node create-test-pdf.js
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

function createTestPDF() {
  const doc = new PDFDocument();
  const outputPath = './test-proposal.pdf';
  
  // Pipe to file
  doc.pipe(fs.createWriteStream(outputPath));
  
  // Add comprehensive proposal content
  doc.fontSize(20).text('TCS FLOOR SERVICE PROPOSAL', 50, 50);
  doc.fontSize(12);
  
  // Customer Information
  doc.text('\nCUSTOMER INFORMATION:', 50, 100);
  doc.text('Company: Meridian Business Center LLC', 50, 120);
  doc.text('Contact: Sarah Johnson', 50, 135);
  doc.text('Phone: (555) 123-4567', 50, 150);
  doc.text('Email: sarah.johnson@meridian.com', 50, 165);
  
  // Project Details
  doc.text('\nPROJECT DETAILS:', 50, 200);
  doc.text('Project Address: 1250 Corporate Drive, Suite 300', 50, 220);
  doc.text('City: Atlanta, GA 30309', 50, 235);
  doc.text('Service Type: Floor Stripping and Waxing', 50, 250);
  doc.text('Floor Type: VCT (Vinyl Composite Tile)', 50, 265);
  doc.text('Square Footage: 4,500 sq ft', 50, 280);
  
  // Service Description
  doc.text('\nSERVICE DESCRIPTION:', 50, 315);
  doc.text('Premium Floor Care Package including:', 50, 335);
  doc.text('1) Complete floor stripping using commercial-grade stripper', 60, 350);
  doc.text('2) Deep clean and neutralize all surfaces', 60, 365);
  doc.text('3) Apply 3 coats premium high-traffic floor finish', 60, 380);
  doc.text('4) Buff to high-gloss shine', 60, 395);
  
  // Timeline and Special Requirements
  doc.text('\nTIMELINE:', 50, 430);
  doc.text('Requested Service Date: Next available weekend', 50, 450);
  doc.text('Duration: 2.5 days (Friday 6 PM - Sunday 8 PM)', 50, 465);
  
  doc.text('\nSPECIAL REQUIREMENTS:', 50, 500);
  doc.text('- LEED certified building - use low-odor, eco-friendly products only', 50, 520);
  doc.text('- Weekend work only to minimize business disruption', 50, 535);
  doc.text('- All work areas must be ready by 8 AM Monday', 50, 550);
  doc.text('- Protect reception area artwork with plastic sheeting', 50, 565);
  
  // Pricing
  doc.text('\nPRICING BREAKDOWN:', 50, 600);
  doc.text('Floor Stripping & Deep Clean (4,500 sq ft): $1,700.00', 50, 620);
  doc.text('Premium 3-Coat Floor Finish Application: $1,800.00', 50, 635);
  doc.text('High-Gloss Buffing & Finishing: $500.00', 50, 650);
  doc.text('Site Logistics & Special Requirements: $150.00', 50, 665);
  doc.text('Quarterly Maintenance & 6-Month Warranty: $100.00', 50, 680);
  doc.text('\nTOTAL: $4,250.00', 50, 710, { underline: true });
  
  // Contact Information
  doc.text('\nCONTACT INFORMATION:', 50, 750);
  doc.text('TCS Floor Service - Professional Floor Care', 50, 770);
  doc.text('Phone: (555) 987-6543', 50, 785);
  doc.text('Email: proposals@tcsfloors.com', 50, 800);
  
  // Finalize
  doc.end();
  
  console.log(`Created comprehensive test PDF: ${outputPath}`);
  console.log('This PDF contains:');
  console.log('- Complete customer information');
  console.log('- Detailed project address');
  console.log('- Service specifications');
  console.log('- Timeline and special requirements');
  console.log('- Itemized pricing breakdown');
  console.log('- Total cost');
}

if (require.main === module) {
  createTestPDF();
}

module.exports = { createTestPDF };
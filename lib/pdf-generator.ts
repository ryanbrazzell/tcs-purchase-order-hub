import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, TAX_RATE } from '@/types';

export async function generatePurchaseOrderPDF(data: PurchaseOrder): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set fonts
  pdf.setFont('helvetica');
  
  // Page margins
  const marginLeft = 20;
  const marginRight = 20;
  const marginTop = 20;
  const pageWidth = pdf.internal.pageSize.width;
  const contentWidth = pageWidth - marginLeft - marginRight;
  
  let yPosition = marginTop;

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(29, 78, 216); // TCS Blue
  pdf.text('TCS PURCHASE ORDER', marginLeft, yPosition);
  yPosition += 15;

  // PO Number and Date
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(`PO Number: ${data.job.poNumber}`, marginLeft, yPosition);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - marginRight - 50, yPosition);
  yPosition += 10;

  // Divider line
  pdf.setDrawColor(229, 231, 235); // Gray
  pdf.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
  yPosition += 10;

  // Customer Information
  pdf.setFontSize(14);
  pdf.setTextColor(0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer Information', marginLeft, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const customerInfo = [
    `Company: ${data.customer.companyName}`,
    `Contact: ${data.customer.contactName}`,
    `Email: ${data.customer.email}`,
    `Phone: ${data.customer.phone}`,
    `Job Location: ${data.customer.jobLocation}`,
    `Onsite Contact: ${data.customer.onsiteContactName} - ${data.customer.onsiteContactPhone}`
  ];

  customerInfo.forEach(line => {
    pdf.text(line, marginLeft, yPosition);
    yPosition += 6;
  });
  yPosition += 5;

  // Contractor Information
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Contractor Information', marginLeft, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const contractorInfo = [
    `Company: ${data.contractor.companyName}`,
    `Technician: ${data.contractor.technicianName}`,
    `Email: ${data.contractor.email}`,
    `Phone: ${data.contractor.phone}`
  ];

  contractorInfo.forEach(line => {
    pdf.text(line, marginLeft, yPosition);
    yPosition += 6;
  });
  yPosition += 5;

  // Job Details
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Job Details', marginLeft, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const jobDetails = [
    `Service Date: ${data.job.requestedServiceDate}`,
    `Square Footage: ${data.job.squareFootage} sq ft`,
    `Floor Type: ${data.job.floorType}`,
    `Description: ${data.job.description}`
  ];

  jobDetails.forEach(line => {
    pdf.text(line, marginLeft, yPosition);
    yPosition += 6;
  });

  if (data.job.additionalNotes) {
    yPosition += 2;
    pdf.text('Additional Notes:', marginLeft, yPosition);
    yPosition += 6;
    const splitNotes = pdf.splitTextToSize(data.job.additionalNotes, contentWidth - 10);
    pdf.text(splitNotes, marginLeft + 5, yPosition);
    yPosition += splitNotes.length * 5 + 5;
  } else {
    yPosition += 10;
  }

  // Line Items Table
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Line Items', marginLeft, yPosition);
  yPosition += 8;

  // Prepare table data
  const tableData = data.lineItems.map(item => [
    item.description,
    item.quantity.toString(),
    item.unit,
    `$${item.unitPrice.toFixed(2)}`,
    `$${item.total.toFixed(2)}`
  ]);

  // Add table using autoTable
  autoTable(pdf, {
    startY: yPosition,
    head: [['Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [29, 78, 216], // TCS Blue
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10,
      textColor: 50
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' }
    },
    margin: { left: marginLeft, right: marginRight }
  });

  // Get the Y position after the table
  yPosition = (pdf as any).lastAutoTable.finalY + 10;

  // Totals
  const totalsX = pageWidth - marginRight - 60;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Subtotal:', totalsX - 20, yPosition);
  pdf.text(`$${data.subtotal.toFixed(2)}`, totalsX + 20, yPosition, { align: 'right' });
  yPosition += 6;

  pdf.text(`Tax (${(TAX_RATE * 100).toFixed(2)}%):`, totalsX - 20, yPosition);
  pdf.text(`$${data.tax.toFixed(2)}`, totalsX + 20, yPosition, { align: 'right' });
  yPosition += 6;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Total:', totalsX - 20, yPosition);
  pdf.text(`$${data.total.toFixed(2)}`, totalsX + 20, yPosition, { align: 'right' });
  yPosition += 15;

  // Standard Terms
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Terms & Conditions', marginLeft, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const terms = [
    `• ${data.standardTerms.paymentTerms}`,
    `• ${data.standardTerms.photoRequirement}`,
    `• ${data.standardTerms.signOffRequired}`,
    `• ${data.standardTerms.workersCompNote}`
  ];

  terms.forEach(term => {
    pdf.text(term, marginLeft, yPosition);
    yPosition += 6;
  });
  yPosition += 10;

  // Signature Lines
  const signatureY = pdf.internal.pageSize.height - 40;
  
  // Customer Signature
  pdf.line(marginLeft, signatureY, marginLeft + 70, signatureY);
  pdf.setFontSize(9);
  pdf.text('Customer Signature', marginLeft, signatureY + 5);
  pdf.text('Date: _____________', marginLeft, signatureY + 10);

  // Contractor Signature
  pdf.line(pageWidth - marginRight - 70, signatureY, pageWidth - marginRight, signatureY);
  pdf.text('Contractor Signature', pageWidth - marginRight - 70, signatureY + 5);
  pdf.text('Date: _____________', pageWidth - marginRight - 70, signatureY + 10);

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text('Generated by TCS Purchase Order Hub', pageWidth / 2, pdf.internal.pageSize.height - 10, { align: 'center' });

  // Return as blob
  return pdf.output('blob');
}
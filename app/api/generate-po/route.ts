import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

const FIELD_SCHEMA = {
  po_date: '',
  po_number: '',
  customer_first_name: '',
  customer_last_name: '',
  customer_company: '',
  onsite_contact_name: '',
  onsite_contact_phone: '',
  customer_phone: '',
  customer_email: '',
  billing_address: '',
  project_address: '',
  city: '',
  state: '',
  zip: '',
  service_type: '',
  floor_type: '',
  square_footage: '',
  unit_price: '',
  subtotal: '',
  tax: '',
  total: '',
  timeline: '',
  requested_service_date: '',
  special_requirements: '',
  doc_reference: '',
  notes: ''
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fields = { ...FIELD_SCHEMA, ...body };
    
    // Create PDF document
    const doc = new jsPDF();
    
    // Set margins and dimensions
    const pageWidth = doc.internal.pageSize.width;
    const leftMargin = 25;
    const rightMargin = pageWidth - 25;
    const contentWidth = rightMargin - leftMargin;
    let yPos = 30;
    const lineHeight = 6;
    const sectionSpacing = 10;
    
    // Add subtle background for header
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    // Header - Company Name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('TCS FLOORS', pageWidth / 2, 25, { align: 'center' });
    
    // Header - Document Type
    doc.setFontSize(18);
    doc.setFont('helvetica', 'normal');
    doc.text('PURCHASE ORDER', pageWidth / 2, 40, { align: 'center' });
    
    // Draw header line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, 50, rightMargin, 50);
    
    // PO Info - Date and Number
    yPos = 65;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${fields.po_date || new Date().toLocaleDateString()}`, leftMargin, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`PO #: ${fields.po_number || 'DRAFT'}`, rightMargin - 60, yPos, { align: 'left' });
    yPos += sectionSpacing;
    
    // Customer Information Section
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', leftMargin, yPos);
    yPos += lineHeight + 2;
    
    // Reset to normal text
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // Customer details with better formatting
    const customerName = [fields.customer_first_name, fields.customer_last_name].filter(Boolean).join(' ');
    if (customerName) {
      doc.setFont('helvetica', 'bold');
      doc.text('Name:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(customerName, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.customer_company) {
      doc.setFont('helvetica', 'bold');
      doc.text('Company:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.customer_company, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.customer_phone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Phone:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.customer_phone, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.customer_email) {
      doc.setFont('helvetica', 'bold');
      doc.text('Email:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.customer_email, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.billing_address) {
      doc.setFont('helvetica', 'bold');
      doc.text('Billing Address:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      const billingAddr = `${fields.billing_address}${fields.city || fields.state || fields.zip ? ', ' : ''}${[fields.city, fields.state, fields.zip].filter(Boolean).join(', ')}`;
      doc.text(billingAddr, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    const projectAddr = fields.project_address || [fields.city, fields.state, fields.zip].filter(Boolean).join(', ');
    if (projectAddr) {
      doc.setFont('helvetica', 'bold');
      doc.text('Project Address:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(projectAddr, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.onsite_contact_name) {
      doc.setFont('helvetica', 'bold');
      doc.text('Onsite Contact:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${fields.onsite_contact_name}${fields.onsite_contact_phone ? ` (${fields.onsite_contact_phone})` : ''}`, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    yPos += sectionSpacing;
    
    // Draw separator line
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3);
    yPos += 5;
    
    // Service Details Section
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DETAILS', leftMargin, yPos);
    yPos += lineHeight + 2;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    if (fields.service_type) {
      doc.setFont('helvetica', 'bold');
      doc.text('Service Type:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.service_type, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.floor_type) {
      doc.setFont('helvetica', 'bold');
      doc.text('Floor Type:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.floor_type, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.square_footage) {
      doc.setFont('helvetica', 'bold');
      doc.text('Square Footage:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.square_footage, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.timeline) {
      doc.setFont('helvetica', 'bold');
      doc.text('Timeline:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.timeline, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    if (fields.requested_service_date) {
      doc.setFont('helvetica', 'bold');
      doc.text('Service Date:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.requested_service_date, leftMargin + 45, yPos);
      yPos += lineHeight;
    }
    
    yPos += sectionSpacing;
    
    // Draw separator line
    doc.setDrawColor(220, 220, 220);
    doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3);
    yPos += 5;
    
    // Pricing Section
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PRICING', leftMargin, yPos);
    yPos += lineHeight + 2;
    
    doc.setFontSize(11);
    
    // Create pricing box
    const priceBoxStart = yPos - 2;
    
    if (fields.unit_price) {
      doc.setFont('helvetica', 'bold');
      doc.text('Unit Price (per sq ft):', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`$${fields.unit_price}${fields.unit_price.includes('/') ? '' : '/sqft'}`, leftMargin + 60, yPos);
      yPos += lineHeight;
    }
    
    if (fields.subtotal) {
      doc.setFont('helvetica', 'bold');
      doc.text('Subtotal:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`$${fields.subtotal}`, leftMargin + 60, yPos);
      yPos += lineHeight;
    }
    
    if (fields.tax) {
      doc.setFont('helvetica', 'bold');
      doc.text('Tax:', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`$${fields.tax}`, leftMargin + 60, yPos);
      yPos += lineHeight;
    }
    
    // Draw line above total
    doc.setLineWidth(0.5);
    doc.line(leftMargin, yPos, leftMargin + 100, yPos);
    yPos += 3;
    
    // Total with emphasis
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', leftMargin, yPos);
    doc.text(`$${fields.total || fields.subtotal || '0.00'}`, leftMargin + 60, yPos);
    
    // Box around pricing
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(leftMargin - 5, priceBoxStart, 110, yPos - priceBoxStart + 5);
    
    yPos += sectionSpacing + 5;
    
    // Additional info sections
    if (fields.special_requirements) {
      // Draw separator line
      doc.setDrawColor(220, 220, 220);
      doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3);
      yPos += 5;
      
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('SPECIAL REQUIREMENTS', leftMargin, yPos);
      yPos += lineHeight + 2;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Wrap long text
      const lines = doc.splitTextToSize(fields.special_requirements, contentWidth);
      lines.forEach((line: string) => {
        doc.text(line, leftMargin, yPos);
        yPos += lineHeight;
      });
      yPos += sectionSpacing;
    }
    
    if (fields.notes) {
      // Draw separator line
      doc.setDrawColor(220, 220, 220);
      doc.line(leftMargin, yPos - 3, rightMargin, yPos - 3);
      yPos += 5;
      
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES', leftMargin, yPos);
      yPos += lineHeight + 2;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const lines = doc.splitTextToSize(fields.notes, contentWidth);
      lines.forEach((line: string) => {
        doc.text(line, leftMargin, yPos);
        yPos += lineHeight;
      });
    }
    
    // Footer - positioned at bottom
    const footerY = 270;
    
    // Footer background
    doc.setFillColor(250, 250, 250);
    doc.rect(0, footerY - 10, pageWidth, 30, 'F');
    
    // Footer text
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('This purchase order is subject to TCS Floors standard terms and conditions.', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 6, { align: 'center' });
    
    if (fields.doc_reference) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Reference: ${fields.doc_reference}`, pageWidth / 2, footerY + 12, { align: 'center' });
    }
    
    // Get PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="purchase-order-${fields.po_number || 'draft'}.pdf"`
      }
    });
    
  } catch (error: any) {
    console.error('[generate-po] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
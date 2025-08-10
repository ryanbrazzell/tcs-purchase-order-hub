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
    
    // Set font sizes and positions
    let yPos = 20;
    const leftMargin = 20;
    const lineHeight = 7;
    
    // Header
    doc.setFontSize(20);
    doc.text('TCS FLOORS', 105, yPos, { align: 'center' });
    yPos += 10;
    doc.setFontSize(16);
    doc.text('PURCHASE ORDER', 105, yPos, { align: 'center' });
    yPos += 15;
    
    // PO Info
    doc.setFontSize(10);
    doc.text(`Date: ${fields.po_date || new Date().toLocaleDateString()}`, leftMargin, yPos);
    doc.text(`PO #: ${fields.po_number || 'DRAFT'}`, 150, yPos);
    yPos += lineHeight * 2;
    
    // Customer Information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', leftMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += lineHeight;
    
    doc.setFontSize(10);
    const customerName = [fields.customer_first_name, fields.customer_last_name].filter(Boolean).join(' ');
    if (customerName) {
      doc.text(`Name: ${customerName}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.customer_company) {
      doc.text(`Company: ${fields.customer_company}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.customer_phone) {
      doc.text(`Phone: ${fields.customer_phone}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.customer_email) {
      doc.text(`Email: ${fields.customer_email}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.billing_address) {
      doc.text(`Billing Address: ${fields.billing_address}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    
    const projectAddr = fields.project_address || [fields.city, fields.state, fields.zip].filter(Boolean).join(', ');
    if (projectAddr) {
      doc.text(`Project Address: ${projectAddr}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    
    if (fields.onsite_contact_name) {
      doc.text(`Onsite Contact: ${fields.onsite_contact_name}${fields.onsite_contact_phone ? ` (${fields.onsite_contact_phone})` : ''}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    
    yPos += lineHeight;
    
    // Service Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DETAILS', leftMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += lineHeight;
    
    doc.setFontSize(10);
    if (fields.service_type) {
      doc.text(`Service Type: ${fields.service_type}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.floor_type) {
      doc.text(`Floor Type: ${fields.floor_type}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.square_footage) {
      doc.text(`Square Footage: ${fields.square_footage}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.timeline) {
      doc.text(`Timeline: ${fields.timeline}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.requested_service_date) {
      doc.text(`Requested Service Date: ${fields.requested_service_date}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    
    yPos += lineHeight;
    
    // Pricing
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRICING', leftMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += lineHeight;
    
    doc.setFontSize(10);
    if (fields.unit_price) {
      doc.text(`Unit Price (per sq ft): $${fields.unit_price}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.subtotal) {
      doc.text(`Subtotal: $${fields.subtotal}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    if (fields.tax) {
      doc.text(`Tax: $${fields.tax}`, leftMargin, yPos);
      yPos += lineHeight;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${fields.total || fields.subtotal || '0.00'}`, leftMargin, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += lineHeight * 2;
    
    // Additional info
    if (fields.special_requirements) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('SPECIAL REQUIREMENTS', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += lineHeight;
      doc.setFontSize(10);
      
      // Wrap long text
      const lines = doc.splitTextToSize(fields.special_requirements, 170);
      lines.forEach((line: string) => {
        doc.text(line, leftMargin, yPos);
        yPos += lineHeight;
      });
      yPos += lineHeight;
    }
    
    if (fields.notes) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('NOTES', leftMargin, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += lineHeight;
      doc.setFontSize(10);
      
      const lines = doc.splitTextToSize(fields.notes, 170);
      lines.forEach((line: string) => {
        doc.text(line, leftMargin, yPos);
        yPos += lineHeight;
      });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.text('This purchase order is subject to TCS Floors standard terms and conditions.', 105, 270, { align: 'center' });
    doc.text('Thank you for your business!', 105, 275, { align: 'center' });
    
    if (fields.doc_reference) {
      doc.text(`Reference: ${fields.doc_reference}`, 105, 280, { align: 'center' });
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
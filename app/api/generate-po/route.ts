import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

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
    const doc = new PDFDocument({ margin: 40 });
    
    // Collect PDF chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    // Generate PDF content
    doc.fontSize(20).text('TCS Floors', { align: 'center' });
    doc.fontSize(16).text('Purchase Order', { align: 'center' }).moveDown();
    
    // Header info
    doc.fontSize(10);
    doc.text(`Date: ${fields.po_date || ''}`);
    doc.text(`PO #: ${fields.po_number || ''}`).moveDown();
    
    // Customer section
    doc.fontSize(12).text('Customer Information', { underline: true }).moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Name: ${[fields.customer_first_name, fields.customer_last_name].filter(Boolean).join(' ')}`);
    doc.text(`Company: ${fields.customer_company}`);
    doc.text(`Phone: ${fields.customer_phone}`);
    doc.text(`Email: ${fields.customer_email}`);
    doc.text(`Billing Address: ${fields.billing_address}`);
    
    const projectAddr = fields.project_address || [fields.city, fields.state, fields.zip].filter(Boolean).join(', ');
    doc.text(`Project Address: ${projectAddr}`).moveDown();
    
    // Onsite contact
    doc.text(`Onsite Contact: ${fields.onsite_contact_name}${fields.onsite_contact_phone ? ` (${fields.onsite_contact_phone})` : ''}`).moveDown();
    
    // Service details
    doc.fontSize(12).text('Service Details', { underline: true }).moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Service Type: ${fields.service_type}`);
    doc.text(`Floor Type: ${fields.floor_type}`);
    doc.text(`Square Footage: ${fields.square_footage}`);
    doc.text(`Timeline: ${fields.timeline}`);
    doc.text(`Requested Service Date: ${fields.requested_service_date}`).moveDown();
    
    // Pricing
    doc.fontSize(12).text('Pricing', { underline: true }).moveDown(0.5);
    doc.fontSize(10);
    if (fields.unit_price) {
      doc.text(`Unit Price (per sq ft): $${fields.unit_price}`);
    }
    if (fields.subtotal) {
      doc.text(`Subtotal: $${fields.subtotal}`);
    }
    if (fields.tax) {
      doc.text(`Tax: $${fields.tax}`);
    }
    doc.fontSize(12).text(`Total: $${fields.total || '0.00'}`, { underline: false }).moveDown();
    
    // Additional info
    if (fields.special_requirements) {
      doc.fontSize(12).text('Special Requirements', { underline: true }).moveDown(0.5);
      doc.fontSize(10).text(fields.special_requirements).moveDown();
    }
    
    if (fields.doc_reference) {
      doc.text(`Reference: ${fields.doc_reference}`);
    }
    
    if (fields.notes) {
      doc.moveDown().fontSize(12).text('Notes', { underline: true }).moveDown(0.5);
      doc.fontSize(10).text(fields.notes);
    }
    
    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#666666');
    doc.text('This purchase order is subject to TCS Floors standard terms and conditions.', { align: 'center' });
    doc.text('Thank you for your business!', { align: 'center' });
    
    // Finalize PDF
    doc.end();
    
    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
    
    // Return PDF
    return new NextResponse(pdfBuffer as any, {
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
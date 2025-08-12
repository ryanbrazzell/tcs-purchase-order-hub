import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
  service_description: '',
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
  notes: '',
  line_items: [] as any[]
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fields = { ...FIELD_SCHEMA, ...body };
    
    // Parse line items if provided as string
    if (typeof fields.line_items === 'string') {
      try {
        fields.line_items = JSON.parse(fields.line_items);
      } catch {
        fields.line_items = [];
      }
    }
    
    // Create PDF document
    const doc = new jsPDF();
    
    // Set margins and dimensions
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    let yPos = 20;
    
    // Company Header
    doc.setFillColor(79, 70, 229); // Indigo color
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Company Name and Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('TCS FLOORS', pageWidth / 2, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('PURCHASE ORDER', pageWidth / 2, 30, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // PO Header Info Box
    yPos = 50;
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', margin + 5, yPos + 5);
    doc.text('PO Number:', pageWidth / 2, yPos + 5);
    
    doc.setFont('helvetica', 'normal');
    doc.text(fields.po_date || new Date().toLocaleDateString(), margin + 20, yPos + 5);
    doc.text(fields.po_number || 'DRAFT', pageWidth / 2 + 30, yPos + 5);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Service Date:', margin + 5, yPos + 15);
    doc.text('Reference:', pageWidth / 2, yPos + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text(fields.requested_service_date || 'TBD', margin + 35, yPos + 15);
    doc.text(fields.doc_reference || 'N/A', pageWidth / 2 + 30, yPos + 15);
    
    yPos += 35;
    
    // Two-column layout for Customer and Job Site Information
    const colWidth = (pageWidth - 3 * margin) / 2;
    
    // Customer Information (Left Column)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', margin, yPos);
    
    // Job Site Information (Right Column)
    doc.text('JOB SITE INFORMATION', margin + colWidth + margin, yPos);
    yPos += 8;
    
    // Customer details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const leftX = margin;
    const rightX = margin + colWidth + margin;
    let leftY = yPos;
    let rightY = yPos;
    
    // Left column - Customer
    const customerName = [fields.customer_first_name, fields.customer_last_name].filter(Boolean).join(' ');
    if (customerName || fields.customer_company) {
      doc.setFont('helvetica', 'bold');
      doc.text('Company/Name:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      const custDisplay = fields.customer_company || customerName;
      doc.text(custDisplay, leftX, leftY + 5, { maxWidth: colWidth - 10 });
      if (fields.customer_company && customerName) {
        doc.text(`Attn: ${customerName}`, leftX, leftY + 10, { maxWidth: colWidth - 10 });
        leftY += 15;
      } else {
        leftY += 10;
      }
    }
    
    if (fields.customer_phone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Phone:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.customer_phone, leftX, leftY + 5);
      leftY += 10;
    }
    
    if (fields.customer_email) {
      doc.setFont('helvetica', 'bold');
      doc.text('Email:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.customer_email, leftX, leftY + 5, { maxWidth: colWidth - 10 });
      leftY += 10;
    }
    
    if (fields.billing_address) {
      doc.setFont('helvetica', 'bold');
      doc.text('Billing Address:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      const billingLines = doc.splitTextToSize(
        `${fields.billing_address}${fields.city || fields.state || fields.zip ? '\n' : ''}${[fields.city, fields.state, fields.zip].filter(Boolean).join(', ')}`,
        colWidth - 10
      );
      billingLines.forEach((line: string, i: number) => {
        doc.text(line, leftX, leftY + 5 + (i * 5));
      });
      leftY += 5 + (billingLines.length * 5);
    }
    
    // Right column - Job Site
    if (fields.project_address) {
      doc.setFont('helvetica', 'bold');
      doc.text('Project Address:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      const projLines = doc.splitTextToSize(fields.project_address, colWidth - 10);
      projLines.forEach((line: string, i: number) => {
        doc.text(line, rightX, rightY + 5 + (i * 5));
      });
      rightY += 5 + (projLines.length * 5);
    }
    
    if (fields.onsite_contact_name) {
      doc.setFont('helvetica', 'bold');
      doc.text('Onsite Contact:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.onsite_contact_name, rightX, rightY + 5);
      if (fields.onsite_contact_phone) {
        doc.text(fields.onsite_contact_phone, rightX, rightY + 10);
        rightY += 15;
      } else {
        rightY += 10;
      }
    }
    
    if (fields.timeline) {
      doc.setFont('helvetica', 'bold');
      doc.text('Timeline:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      const timelineLines = doc.splitTextToSize(fields.timeline, colWidth - 10);
      timelineLines.forEach((line: string, i: number) => {
        doc.text(line, rightX, rightY + 5 + (i * 5));
      });
      rightY += 5 + (timelineLines.length * 5);
    }
    
    yPos = Math.max(leftY, rightY) + 15;
    
    // Service Description Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DESCRIPTION', margin, yPos);
    yPos += 8;
    
    // Service description box
    doc.setFillColor(249, 250, 251);
    const descBoxHeight = fields.service_description ? Math.max(30, doc.splitTextToSize(fields.service_description, pageWidth - 2 * margin - 10).length * 5 + 10) : 30;
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, descBoxHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (fields.service_description) {
      const descLines = doc.splitTextToSize(fields.service_description, pageWidth - 2 * margin - 10);
      descLines.forEach((line: string, i: number) => {
        doc.text(line, margin + 5, yPos + 2 + (i * 5));
      });
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text('No service description provided', margin + 5, yPos + 2);
      doc.setTextColor(0, 0, 0);
    }
    
    yPos += descBoxHeight + 10;
    
    // Line Items / Pricing Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRICING DETAILS', margin, yPos);
    yPos += 8;
    
    // Prepare line items data
    const lineItems = fields.line_items && fields.line_items.length > 0 ? fields.line_items : [
      {
        description: fields.service_type || 'Floor Service',
        details: `${fields.floor_type || ''} - ${fields.square_footage || '0'} sq ft`.trim(),
        quantity: fields.square_footage || '1',
        unit: 'sq ft',
        unitPrice: fields.unit_price || '0.00',
        total: fields.subtotal || '0.00'
      }
    ];
    
    // Create pricing table
    (doc as any).autoTable({
      startY: yPos,
      head: [['Description', 'Quantity', 'Unit Price', 'Total']],
      body: lineItems.map((item: any) => [
        item.description + (item.details ? `\n${item.details}` : ''),
        `${item.quantity} ${item.unit || ''}`.trim(),
        `$${item.unitPrice}`,
        `$${item.total}`
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: margin, right: margin }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 5;
    
    // Totals section
    const totalsX = pageWidth - margin - 80;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (fields.subtotal) {
      doc.text('Subtotal:', totalsX, yPos);
      doc.text(`$${fields.subtotal}`, totalsX + 60, yPos, { align: 'right' });
      yPos += 6;
    }
    
    if (fields.tax) {
      doc.text('Tax:', totalsX, yPos);
      doc.text(`$${fields.tax}`, totalsX + 60, yPos, { align: 'right' });
      yPos += 6;
    }
    
    // Total line
    doc.setLineWidth(0.5);
    doc.line(totalsX, yPos - 2, totalsX + 60, yPos - 2);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', totalsX, yPos + 5);
    doc.text(`$${fields.total || fields.subtotal || '0.00'}`, totalsX + 60, yPos + 5, { align: 'right' });
    
    yPos += 20;
    
    // Additional Notes Section
    if (fields.special_requirements || fields.notes) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ADDITIONAL INFORMATION', margin, yPos);
      yPos += 8;
      
      // Combined notes box
      const notesContent = [];
      if (fields.special_requirements) {
        notesContent.push('Special Requirements:', fields.special_requirements, '');
      }
      if (fields.notes) {
        notesContent.push('Notes:', fields.notes);
      }
      
      const notesText = notesContent.join('\n');
      const notesLines = doc.splitTextToSize(notesText, pageWidth - 2 * margin - 10);
      const notesBoxHeight = Math.max(40, notesLines.length * 5 + 10);
      
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, notesBoxHeight, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      let noteY = yPos;
      notesLines.forEach((line: string) => {
        if (line.includes('Special Requirements:') || line.includes('Notes:')) {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(line, margin + 5, noteY);
        noteY += 5;
      });
    }
    
    // Footer
    const footerY = pageHeight - 30;
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
    
    // Footer text
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('This purchase order is subject to TCS Floors standard terms and conditions.', pageWidth / 2, footerY, { align: 'center' });
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 5, { align: 'center' });
    
    // Contact info
    doc.setFontSize(8);
    doc.text('TCS Floors | adminoffice@tcsfloors.com | 678-713-0677', pageWidth / 2, footerY + 12, { align: 'center' });
    
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
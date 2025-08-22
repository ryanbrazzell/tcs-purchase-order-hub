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
    yPos = 55;
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 30, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Date:', margin + 5, yPos + 6);
    doc.text('PO Number:', pageWidth / 2, yPos + 6);
    
    doc.setFont('helvetica', 'normal');
    doc.text(fields.po_date || new Date().toLocaleDateString(), margin + 25, yPos + 6);
    doc.text(fields.po_number || 'DRAFT', pageWidth / 2 + 35, yPos + 6);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Service Date:', margin + 5, yPos + 18);
    doc.text('Reference:', pageWidth / 2, yPos + 18);
    
    doc.setFont('helvetica', 'normal');
    doc.text(fields.requested_service_date || 'TBD', margin + 40, yPos + 18);
    doc.text(fields.doc_reference || 'N/A', pageWidth / 2 + 35, yPos + 18);
    
    yPos += 45;
    
    // Two-column layout for Customer and Job Site Information
    const colWidth = (pageWidth - 3 * margin) / 2;
    
    // Customer Information (Left Column)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER INFORMATION', margin, yPos);
    
    // Job Site Information (Right Column)
    doc.text('JOB SITE INFORMATION', margin + colWidth + margin, yPos);
    yPos += 12;
    
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
      doc.text(custDisplay, leftX, leftY + 6, { maxWidth: colWidth - 10 });
      if (fields.customer_company && customerName) {
        doc.text(`Attn: ${customerName}`, leftX, leftY + 12, { maxWidth: colWidth - 10 });
        leftY += 20;
      } else {
        leftY += 14;
      }
    }
    
    if (fields.customer_phone) {
      doc.setFont('helvetica', 'bold');
      doc.text('Phone:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.customer_phone, leftX, leftY + 6);
      leftY += 14;
    }
    
    if (fields.customer_email) {
      doc.setFont('helvetica', 'bold');
      doc.text('Email:', leftX, leftY);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.customer_email, leftX, leftY + 6, { maxWidth: colWidth - 10 });
      leftY += 14;
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
        doc.text(line, leftX, leftY + 6 + (i * 6));
      });
      leftY += 6 + (billingLines.length * 6) + 4;
    }
    
    // Right column - Job Site
    if (fields.project_address) {
      doc.setFont('helvetica', 'bold');
      doc.text('Project Address:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      const projLines = doc.splitTextToSize(fields.project_address, colWidth - 10);
      projLines.forEach((line: string, i: number) => {
        doc.text(line, rightX, rightY + 6 + (i * 6));
      });
      rightY += 6 + (projLines.length * 6) + 4;
    }
    
    if (fields.onsite_contact_name) {
      doc.setFont('helvetica', 'bold');
      doc.text('Onsite Contact:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.onsite_contact_name, rightX, rightY + 6);
      if (fields.onsite_contact_phone) {
        doc.text(fields.onsite_contact_phone, rightX, rightY + 12);
        rightY += 20;
      } else {
        rightY += 14;
      }
    }
    
    if (fields.timeline) {
      doc.setFont('helvetica', 'bold');
      doc.text('Timeline:', rightX, rightY);
      doc.setFont('helvetica', 'normal');
      const timelineLines = doc.splitTextToSize(fields.timeline, colWidth - 10);
      timelineLines.forEach((line: string, i: number) => {
        doc.text(line, rightX, rightY + 6 + (i * 6));
      });
      rightY += 6 + (timelineLines.length * 6);
    }
    
    yPos = Math.max(leftY, rightY) + 20;
    
    // Service Description Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DESCRIPTION', margin, yPos);
    yPos += 12;
    
    // Service description box
    doc.setFillColor(249, 250, 251);
    const descBoxHeight = fields.service_description ? Math.max(35, doc.splitTextToSize(fields.service_description, pageWidth - 2 * margin - 20).length * 6 + 15) : 35;
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, descBoxHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (fields.service_description) {
      const descLines = doc.splitTextToSize(fields.service_description, pageWidth - 2 * margin - 20);
      descLines.forEach((line: string, i: number) => {
        doc.text(line, margin + 10, yPos + 5 + (i * 6));
      });
    } else {
      doc.setTextColor(150, 150, 150);
      doc.text('No service description provided', margin + 10, yPos + 5);
      doc.setTextColor(0, 0, 0);
    }
    
    yPos += descBoxHeight + 15;
    
    // Line Items / Pricing Table
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PRICING DETAILS', margin, yPos);
    yPos += 12;
    
    // Prepare line items data
    const lineItems = fields.line_items && fields.line_items.length > 0 ? fields.line_items : [
      {
        description: fields.service_type || 'Floor Service',
        details: `${fields.floor_type || ''} - ${fields.square_footage || '0'} sqft`.trim(),
        quantity: fields.square_footage || '1',
        unit: 'sqft',
        unitPrice: String(fields.unit_price || '0.00').replace(/[$,]/g, ''),
        total: String(fields.subtotal || '0.00').replace(/[$,]/g, '')
      }
    ];
    
    // Create pricing table
    (doc as any).autoTable({
      startY: yPos,
      head: [['Description', 'Quantity', 'Unit Price', 'Total']],
      body: lineItems.map((item: any) => [
        item.description + (item.details ? `\n${item.details}` : ''),
        `${item.quantity} ${item.unit || ''}`.trim(),
        `$${String(item.unitPrice).replace(/[$,]/g, '')}`,
        `$${String(item.total).replace(/[$,]/g, '')}`
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
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
    
    // Totals section
    const totalsX = pageWidth - margin - 80;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (fields.subtotal) {
      doc.text('Subtotal:', totalsX, yPos);
      const subtotalAmount = String(fields.subtotal || '0.00').replace(/[$,]/g, '');
      doc.text(`$${subtotalAmount}`, totalsX + 60, yPos, { align: 'right' });
      yPos += 6;
    }
    
    if (fields.tax) {
      doc.text('Tax:', totalsX, yPos);
      const taxAmount = String(fields.tax || '0.00').replace(/[$,]/g, '');
      doc.text(`$${taxAmount}`, totalsX + 60, yPos, { align: 'right' });
      yPos += 6;
    }
    
    // Total line
    doc.setLineWidth(0.5);
    doc.line(totalsX, yPos - 2, totalsX + 60, yPos - 2);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', totalsX, yPos + 5);
    const totalAmount = String(fields.total || fields.subtotal || '0.00').replace(/[$,]/g, '');
    doc.text(`$${totalAmount}`, totalsX + 60, yPos + 5, { align: 'right' });
    
    yPos += 30;
    
    // Additional Notes Section
    if (fields.special_requirements || fields.notes) {
      // Check if we have enough space for notes section
      const estimatedNotesHeight = 60; // Estimate
      if (yPos + estimatedNotesHeight > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ADDITIONAL INFORMATION', margin, yPos);
      yPos += 12;
      
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
      const notesBoxHeight = Math.max(50, notesLines.length * 6 + 20);
      
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, notesBoxHeight, 'F');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      let noteY = yPos + 5;
      notesLines.forEach((line: string) => {
        if (line.includes('Special Requirements:') || line.includes('Notes:')) {
          doc.setFont('helvetica', 'bold');
          if (noteY > yPos + 5) noteY += 4; // Extra space before new section
        } else {
          doc.setFont('helvetica', 'normal');
        }
        doc.text(line, margin + 10, noteY);
        noteY += 6;
      });
      
      yPos = noteY + 15;
    }
    
    // Footer - Dynamic positioning
    const footerHeight = 35;
    let footerY;
    
    // Calculate where footer should go
    if (yPos + footerHeight > pageHeight - 20) {
      // Not enough space, use bottom of page
      footerY = pageHeight - footerHeight;
    } else {
      // Place footer after content with some spacing
      footerY = Math.max(yPos + 20, pageHeight - footerHeight);
    }
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    
    // Footer text
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('This purchase order is subject to TCS Floors standard terms and conditions.', pageWidth / 2, footerY + 10, { align: 'center' });
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 16, { align: 'center' });
    
    // Contact info
    doc.setFontSize(8);
    doc.text('TCS Floors | adminoffice@tcsfloors.com | 678-713-0677', pageWidth / 2, footerY + 24, { align: 'center' });
    
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
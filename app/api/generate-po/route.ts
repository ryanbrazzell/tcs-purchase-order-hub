import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
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
  project_address: '',
  city: '',
  state: '',
  zip: '',
  service_type: '',
  service_description: '',
  floor_type: '',
  square_footage: '',
  total: '',
  timeline: '',
  requested_service_date: '',
  special_requirements: '',
  doc_reference: '',
  notes: '',
  subcontractor_company: '',
  subcontractor_contact: '',
  subcontractor_phone: '',
  subcontractor_email: '',
  subcontractor_address: '',
  subcontractor_city: '',
  subcontractor_state: '',
  subcontractor_zip: '',
  line_item_1_desc: '',
  line_item_1_price: '',
  line_item_2_desc: '',
  line_item_2_price: '',
  line_item_3_desc: '',
  line_item_3_price: '',
  line_item_4_desc: '',
  line_item_4_price: '',
  line_item_5_desc: '',
  line_item_5_price: '',
  line_items: [] as any[]
};

// Professional color palette
const COLORS = {
  primary: [41, 37, 36], // Near black for text
  secondary: [115, 115, 115], // Gray for secondary text
  accent: [79, 70, 229], // Indigo for headers
  lightAccent: [99, 102, 241], // Lighter indigo
  background: [249, 250, 251], // Light gray background
  border: [229, 231, 235], // Border gray
  white: [255, 255, 255],
};

// Helper function to set colors
function setColor(doc: jsPDF, color: number[], type: 'text' | 'fill' | 'draw') {
  switch (type) {
    case 'text':
      doc.setTextColor(color[0], color[1], color[2]);
      break;
    case 'fill':
      doc.setFillColor(color[0], color[1], color[2]);
      break;
    case 'draw':
      doc.setDrawColor(color[0], color[1], color[2]);
      break;
  }
}

// Helper function to format currency
function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/[$,]/g, '')) : value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num || 0);
}

// Helper function to draw a section header
function drawSectionHeader(doc: jsPDF, text: string, x: number, y: number, width: number) {
  setColor(doc, COLORS.background, 'fill');
  doc.rect(x, y - 5, width, 8, 'F');
  setColor(doc, COLORS.border, 'draw');
  doc.line(x, y + 3, x + width, y + 3);
  setColor(doc, COLORS.primary, 'text');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(text, x + 2, y);
}

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
    const margin = 15;
    const contentWidth = pageWidth - (2 * margin);
    let yPos = 15;
    
    // Professional Header with Company Information
    // TCS Company Information
    setColor(doc, COLORS.primary, 'text');
    doc.setFontSize(26);
    doc.setFont('helvetica', 'bold');
    doc.text('TCS FLOORS INC.', margin, yPos + 10);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    setColor(doc, COLORS.secondary, 'text');
    doc.text('Total Cleaning Solutions', margin, yPos + 20);
    doc.text('Professional Commercial Flooring Services', margin, yPos + 28);
    doc.text('Phone: (866) 607-8659', margin, yPos + 36);
    doc.text('Website: www.tcsfloors.com', margin, yPos + 44);
    
    // Purchase Order Title and Number
    const poBoxX = pageWidth - margin - 65;
    setColor(doc, COLORS.accent, 'fill');
    doc.rect(poBoxX, yPos, 65, 30, 'F');
    setColor(doc, COLORS.white, 'text');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', poBoxX + 32.5, yPos + 10, { align: 'center' });
    doc.setFontSize(14);
    doc.text(fields.po_number || 'DRAFT', poBoxX + 32.5, yPos + 22, { align: 'center' });
    
    yPos += 50;
    
    // Date and Reference Information Bar
    setColor(doc, COLORS.background, 'fill');
    doc.rect(margin, yPos, contentWidth, 25, 'F');
    setColor(doc, COLORS.border, 'draw');
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, contentWidth, 25);
    
    // Date information
    const dateInfoY = yPos + 8;
    setColor(doc, COLORS.secondary, 'text');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Date:', margin + 5, dateInfoY);
    doc.text('Service Date:', margin + 50, dateInfoY);
    doc.text('Reference:', margin + 110, dateInfoY);
    
    setColor(doc, COLORS.primary, 'text');
    doc.setFont('helvetica', 'bold');
    doc.text(fields.po_date || new Date().toLocaleDateString(), margin + 5, dateInfoY + 7);
    doc.text(fields.requested_service_date || 'TBD', margin + 50, dateInfoY + 7);
    doc.text(fields.doc_reference || 'N/A', margin + 110, dateInfoY + 7);
    
    yPos += 35;
    
    // Subcontractor Information Section
    drawSectionHeader(doc, 'SUBCONTRACTOR INFORMATION', margin, yPos, contentWidth);
    yPos += 10;
    
    doc.setFontSize(10);
    setColor(doc, COLORS.primary, 'text');
    
    // Subcontractor details in a clean layout
    if (fields.subcontractor_company) {
      doc.setFont('helvetica', 'bold');
      doc.text('Company:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.subcontractor_company, margin + 30, yPos);
      yPos += 6;
    }
    
    if (fields.subcontractor_contact) {
      doc.setFont('helvetica', 'bold');
      doc.text('Contact:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(fields.subcontractor_contact, margin + 30, yPos);
      yPos += 6;
    }
    
    if (fields.subcontractor_phone || fields.subcontractor_email) {
      const halfWidth = contentWidth / 2;
      if (fields.subcontractor_phone) {
        doc.setFont('helvetica', 'bold');
        doc.text('Phone:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(fields.subcontractor_phone, margin + 30, yPos);
      }
      if (fields.subcontractor_email) {
        doc.setFont('helvetica', 'bold');
        doc.text('Email:', margin + halfWidth, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(fields.subcontractor_email, margin + halfWidth + 25, yPos);
      }
      yPos += 6;
    }
    
    if (fields.subcontractor_address || fields.subcontractor_city || fields.subcontractor_state || fields.subcontractor_zip) {
      doc.setFont('helvetica', 'bold');
      doc.text('Address:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      if (fields.subcontractor_address) {
        doc.text(fields.subcontractor_address, margin + 30, yPos);
        yPos += 6;
      }
      const cityStateZip = [fields.subcontractor_city, fields.subcontractor_state, fields.subcontractor_zip].filter(Boolean).join(', ');
      if (cityStateZip) {
        doc.text(cityStateZip, margin + 30, yPos);
        yPos += 6;
      }
    }
    
    yPos += 10;
    
    // Two-column layout for Customer and Job Site Information
    const colWidth = (contentWidth - 10) / 2;
    const leftColX = margin;
    const rightColX = margin + colWidth + 10;
    
    // Section headers
    drawSectionHeader(doc, 'CUSTOMER', leftColX, yPos, colWidth);
    drawSectionHeader(doc, 'JOB SITE', rightColX, yPos, colWidth);
    yPos += 10;
    
    // Customer details with better formatting
    doc.setFontSize(10);
    setColor(doc, COLORS.primary, 'text');
    let leftY = yPos;
    let rightY = yPos;
    
    // Left column - Customer
    const customerName = [fields.customer_first_name, fields.customer_last_name].filter(Boolean).join(' ');
    if (fields.customer_company) {
      doc.setFont('helvetica', 'bold');
      doc.text(fields.customer_company, leftColX, leftY);
      leftY += 6;
      if (customerName) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Contact: ${customerName}`, leftColX, leftY);
        leftY += 6;
      }
    } else if (customerName) {
      doc.setFont('helvetica', 'bold');
      doc.text(customerName, leftColX, leftY);
      leftY += 6;
    }
    
    // Customer phone only
    doc.setFont('helvetica', 'normal');
    if (fields.customer_phone) {
      doc.text(`Phone: ${fields.customer_phone}`, leftColX, leftY);
      leftY += 5;
    }
    
    // Right column - Job Site
    doc.setFont('helvetica', 'normal');
    if (fields.project_address) {
      const projLines = doc.splitTextToSize(fields.project_address, colWidth - 5);
      projLines.forEach((line: string) => {
        doc.text(line, rightColX, rightY);
        rightY += 5;
      });
      rightY += 3;
    }
    
    if (fields.city || fields.state || fields.zip) {
      const cityStateZip = [fields.city, fields.state, fields.zip].filter(Boolean).join(', ');
      doc.text(cityStateZip, rightColX, rightY);
      rightY += 8;
    }
    
    if (fields.onsite_contact_name) {
      doc.setFont('helvetica', 'bold');
      doc.text('Onsite Contact:', rightColX, rightY);
      rightY += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(fields.onsite_contact_name, rightColX, rightY);
      rightY += 5;
      if (fields.onsite_contact_phone) {
        doc.text(fields.onsite_contact_phone, rightColX, rightY);
        rightY += 8;
      }
    }
    
    if (fields.timeline) {
      doc.setFont('helvetica', 'bold');
      doc.text('Timeline:', rightColX, rightY);
      rightY += 5;
      doc.setFont('helvetica', 'normal');
      const timelineLines = doc.splitTextToSize(fields.timeline, colWidth - 5);
      timelineLines.forEach((line: string) => {
        doc.text(line, rightColX, rightY);
        rightY += 5;
      });
    }
    
    yPos = Math.max(leftY, rightY) + 15;
    
    // Service Description Section with better styling
    drawSectionHeader(doc, 'SERVICE DESCRIPTION', margin, yPos, contentWidth);
    yPos += 10;
    
    // Service description with proper text wrapping
    if (fields.service_description) {
      setColor(doc, COLORS.primary, 'text');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Split text properly for multi-line content
      const maxWidth = contentWidth - 10;
      const descLines = doc.splitTextToSize(fields.service_description, maxWidth);
      
      // Calculate actual height needed (with proper line spacing)
      const lineHeight = 5;
      const padding = 8;
      const descBoxHeight = Math.max((descLines.length * lineHeight) + padding, 30);
      
      // Check if we need a new page
      if (yPos + descBoxHeight > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
        drawSectionHeader(doc, 'SERVICE DESCRIPTION (continued)', margin, yPos, contentWidth);
        yPos += 10;
      }
      
      // Draw a subtle border around description
      setColor(doc, COLORS.border, 'draw');
      doc.setLineWidth(0.3);
      doc.rect(margin, yPos - 5, contentWidth, descBoxHeight);
      
      // Add the text with proper spacing
      let descY = yPos;
      descLines.forEach((line: string) => {
        // Check if we need to continue on next page
        if (descY > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
          descY = yPos;
          drawSectionHeader(doc, 'SERVICE DESCRIPTION (continued)', margin, yPos - 10, contentWidth);
        }
        doc.text(line, margin + 5, descY);
        descY += lineHeight;
      });
      yPos += descBoxHeight + 10;
    } else {
      setColor(doc, COLORS.secondary, 'text');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('No service description provided', margin + 5, yPos);
      yPos += 15;
    }
    
    // Check if we need a new page for the pricing table
    if (yPos > pageHeight - 100) {
      doc.addPage();
      yPos = 20;
    }
    
    // Line Items / Pricing Table with professional styling
    drawSectionHeader(doc, 'SUB CONTRACTOR PRICING', margin, yPos, contentWidth);
    yPos += 10;
    
    // Prepare line items data from the 5 line item fields
    const lineItems = [];
    let runningTotal = 0;
    
    // Collect all 5 line items
    for (let i = 1; i <= 5; i++) {
      const descKey = `line_item_${i}_desc` as keyof typeof fields;
      const priceKey = `line_item_${i}_price` as keyof typeof fields;
      
      if (fields[descKey] && fields[priceKey]) {
        const price = parseFloat(String(fields[priceKey]).replace(/[$,]/g, '')) || 0;
        lineItems.push({
          description: fields[descKey],
          total: price
        });
        runningTotal += price;
      }
    }
    
    // If no line items, use service type as fallback
    if (lineItems.length === 0 && fields.service_type) {
      lineItems.push({
        description: fields.service_type || 'Service',
        total: parseFloat(String(fields.total).replace(/[$,]/g, '')) || 0
      });
      runningTotal = parseFloat(String(fields.total).replace(/[$,]/g, '')) || 0;
    }
    
    // Create professional pricing table
    doc.autoTable({
      startY: yPos,
      head: [['Item Description', 'Amount']],
      body: lineItems.map((item: any) => {
        return [
          item.description,
          formatCurrency(item.total)
        ];
      }),
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: 4,
        textColor: COLORS.primary,
      },
      alternateRowStyles: {
        fillColor: COLORS.background,
      },
      columnStyles: {
        0: { cellWidth: 140 },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: margin, right: margin },
      didDrawPage: function() {
        // Add continuation header if table spans multiple pages
        doc.setFontSize(8);
        setColor(doc, COLORS.secondary, 'text');
        doc.text('(continued)', margin, 15);
      },
    });
    
    yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 50;
    
    // Professional totals section
    const totalsBoxWidth = 90;
    const totalsX = pageWidth - margin - totalsBoxWidth;
    
    // Totals background
    setColor(doc, COLORS.background, 'fill');
    doc.rect(totalsX, yPos, totalsBoxWidth, 25, 'F');
    setColor(doc, COLORS.border, 'draw');
    doc.setLineWidth(0.3);
    doc.rect(totalsX, yPos, totalsBoxWidth, 25);
    
    // Total only (no subtotal or tax)
    setColor(doc, COLORS.primary, 'text');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', totalsX + 5, yPos + 15);
    const totalAmount = fields.total || String(runningTotal) || '0';
    doc.text(formatCurrency(totalAmount), totalsX + totalsBoxWidth - 5, yPos + 15, { align: 'right' });
    
    yPos += 35;
    
    // Permanent Requirements Section
    if (yPos + 80 > pageHeight - 60) {
      doc.addPage();
      yPos = 20;
    }
    
    drawSectionHeader(doc, 'REQUIREMENTS FOR PAYMENT', margin, yPos, contentWidth);
    yPos += 10;
    
    setColor(doc, COLORS.primary, 'text');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Requirements box with border
    const reqBoxHeight = 25;
    setColor(doc, COLORS.border, 'draw');
    doc.setLineWidth(0.5);
    doc.rect(margin, yPos - 5, contentWidth, reqBoxHeight);
    
    doc.text('The following requirements MUST be completed in order to receive payment:', margin + 5, yPos);
    yPos += 7;
    
    doc.setFont('helvetica', 'normal');
    doc.text('\u2022 12 "Before" and 12 "After" photos must be forwarded to your TCS supervisor', margin + 10, yPos);
    yPos += 6;
    doc.text('\u2022 A work order sign-off sheet must be signed by the customer prior to departure', margin + 10, yPos);
    yPos += 15;
      
      // Additional notes if any
      if (fields.special_requirements || fields.notes) {
        drawSectionHeader(doc, 'ADDITIONAL NOTES', margin, yPos, contentWidth);
        yPos += 10;
        
        setColor(doc, COLORS.primary, 'text');
        doc.setFontSize(10);
        
        if (fields.special_requirements) {
          doc.setFont('helvetica', 'bold');
          doc.text('Special Requirements:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          const reqLines = doc.splitTextToSize(fields.special_requirements, contentWidth - 10);
          reqLines.forEach((line: string) => {
            doc.text(line, margin + 5, yPos);
            yPos += 5;
          });
          yPos += 5;
        }
        
        if (fields.notes) {
          doc.setFont('helvetica', 'bold');
          doc.text('Additional Notes:', margin, yPos);
          yPos += 5;
          doc.setFont('helvetica', 'normal');
          const noteLines = doc.splitTextToSize(fields.notes, contentWidth - 10);
          noteLines.forEach((line: string) => {
            doc.text(line, margin + 5, yPos);
            yPos += 5;
          });
        }
      }
      
      yPos += 15;
    
    // Acceptance Section
    if (yPos + 80 > pageHeight - 40) {
      doc.addPage();
      yPos = 20;
    }
    
    drawSectionHeader(doc, 'SUBCONTRACTOR ACCEPTANCE', margin, yPos, contentWidth);
    yPos += 10;
    
    // Acceptance text
    setColor(doc, COLORS.primary, 'text');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('By signing below, the subcontractor accepts and agrees to perform the work described above', margin, yPos);
    doc.text('at the pricing specified and in accordance with all terms and conditions stated herein.', margin, yPos + 6);
    yPos += 20;
    
    // Signature area with better layout
    const sigBoxHeight = 45;
    setColor(doc, COLORS.background, 'fill');
    doc.rect(margin, yPos, contentWidth, sigBoxHeight, 'F');
    setColor(doc, COLORS.border, 'draw');
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, contentWidth, sigBoxHeight);
    
    yPos += 10;
    
    // Subcontractor signature line
    setColor(doc, COLORS.primary, 'draw');
    doc.setLineWidth(0.5);
    doc.line(margin + 10, yPos + 15, margin + 80, yPos + 15);
    setColor(doc, COLORS.secondary, 'text');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Subcontractor Name (Print)', margin + 10, yPos + 20);
    
    // Signature line
    doc.line(margin + 95, yPos + 15, margin + 165, yPos + 15);
    doc.text('Subcontractor Signature', margin + 95, yPos + 20);
    
    // Date line
    doc.line(pageWidth - margin - 50, yPos + 15, pageWidth - margin - 10, yPos + 15);
    doc.text('Date', pageWidth - margin - 50, yPos + 20);
    
    yPos += 55;
    
    // Professional footer
    const footerHeight = 30;
    const footerY = pageHeight - footerHeight;
    
    // Footer background
    setColor(doc, COLORS.primary, 'fill');
    doc.rect(0, footerY, pageWidth, footerHeight, 'F');
    
    // Footer content
    setColor(doc, COLORS.white, 'text');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank you for your business!', pageWidth / 2, footerY + 10, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('TCS FLOORS INC.  |  www.tcsfloors.com  |  (866) 607-8659', pageWidth / 2, footerY + 18, { align: 'center' });
    
    // Page numbering if multiple pages
    const pageCount = doc.internal.pages.length - 1;
    if (pageCount > 1) {
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        setColor(doc, COLORS.secondary, 'text');
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
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
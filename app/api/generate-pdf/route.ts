import { NextRequest, NextResponse } from 'next/server';
import { generatePurchaseOrderPDF } from '@/lib/pdf-generator';
import { PurchaseOrderSchema } from '@/types';
import { handleAPIError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate purchase order data
    const validationResult = PurchaseOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid purchase order data',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    // Generate PDF
    const pdfBlob = await generatePurchaseOrderPDF(validationResult.data);
    
    // Convert blob to buffer for response
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO-${validationResult.data.job.poNumber || 'draft'}.pdf"`,
      },
    });
    
  } catch (error) {
    console.error('PDF generation error:', error);
    return handleAPIError(error);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-extractor';
import { extractDataWithClaude } from '@/lib/claude-client';
import { ExtractPDFResponse } from '@/types';
import { handleAPIError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          errors: ['No file provided'] 
        },
        { status: 400 }
      );
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { 
          success: false, 
          errors: ['File must be a PDF'] 
        },
        { status: 400 }
      );
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { 
          success: false, 
          errors: ['File size must be less than 10MB'] 
        },
        { status: 400 }
      );
    }
    
    // Extract text from PDF
    const pdfData = await extractTextFromPDF(file);
    
    // Extract structured data using Claude
    const extractionResult = await extractDataWithClaude({
      text: pdfData.text
    });
    
    // Format response
    const response: ExtractPDFResponse = {
      success: true,
      documentType: extractionResult.documentType,
      extractedData: extractionResult.extractedData,
      errors: []
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('PDF extraction error:', error);
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
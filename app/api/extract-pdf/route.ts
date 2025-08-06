import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-extractor';
import { extractDataWithClaude } from '@/lib/claude-client';
import { ExtractPDFResponse } from '@/types';

export async function POST(request: NextRequest) {
  console.log('[extract-pdf] Starting PDF extraction...');
  console.log('[extract-pdf] Environment check:', {
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    apiKeyLength: process.env.ANTHROPIC_API_KEY?.length,
    nodeEnv: process.env.NODE_ENV
  });

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('[extract-pdf] No file provided');
      return NextResponse.json(
        { 
          success: false, 
          errors: ['No file provided'] 
        },
        { status: 400 }
      );
    }

    console.log('[extract-pdf] File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
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
    console.log('[extract-pdf] Extracting text from PDF...');
    let pdfData;
    try {
      pdfData = await extractTextFromPDF(file);
      console.log('[extract-pdf] Text extracted successfully:', {
        textLength: pdfData.text.length,
        numPages: pdfData.numPages
      });
    } catch (pdfError) {
      console.error('[extract-pdf] PDF parsing error:', pdfError);
      return NextResponse.json(
        { 
          success: false, 
          errors: ['Failed to parse PDF. Please ensure the PDF contains text and is not corrupted.'] 
        },
        { status: 500 }
      );
    }
    
    // Extract structured data using Claude
    console.log('[extract-pdf] Calling Claude API...');
    let extractionResult;
    try {
      extractionResult = await extractDataWithClaude({
        text: pdfData.text
      });
      console.log('[extract-pdf] Claude extraction successful');
    } catch (claudeError: any) {
      console.error('[extract-pdf] Claude API error:', claudeError);
      
      // Provide specific error messages
      let errorMessage = 'Failed to extract data from PDF';
      if (claudeError.message?.includes('ANTHROPIC_API_KEY')) {
        errorMessage = 'API key configuration error. Please contact support.';
      } else if (claudeError.status === 401) {
        errorMessage = 'Invalid API key. Please contact support.';
      } else if (claudeError.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (claudeError.status === 400) {
        errorMessage = 'Invalid request to AI service. Please try a different PDF.';
      }
      
      return NextResponse.json(
        { 
          success: false, 
          errors: [errorMessage] 
        },
        { status: 500 }
      );
    }
    
    // Format response
    const response: ExtractPDFResponse = {
      success: true,
      documentType: extractionResult.documentType,
      extractedData: extractionResult.extractedData,
      errors: []
    };
    
    console.log('[extract-pdf] Returning successful response');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[extract-pdf] Unexpected error:', error);
    console.error('[extract-pdf] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false, 
        errors: ['An unexpected error occurred. Please try again.'] 
      },
      { status: 500 }
    );
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
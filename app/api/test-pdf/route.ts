import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/lib/pdf-extractor';

export async function POST(request: NextRequest) {
  console.log('[test-pdf] Starting PDF test...');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('[test-pdf] File info:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // Try different approaches
    const results: any = {
      timestamp: new Date().toISOString(),
      file: {
        name: file.name,
        type: file.type,
        size: file.size
      },
      tests: {}
    };
    
    // Test 1: Check if we can read the file as buffer
    try {
      const arrayBuffer = await file.arrayBuffer();
      results.tests.arrayBuffer = {
        success: true,
        size: arrayBuffer.byteLength
      };
    } catch (error: any) {
      results.tests.arrayBuffer = {
        success: false,
        error: error.message
      };
    }
    
    // Test 2: Try extracting with pdf-parse
    try {
      const extraction = await extractTextFromPDF(file);
      results.tests.extraction = {
        success: true,
        textLength: extraction.text.length,
        numPages: extraction.numPages,
        firstChars: extraction.text.substring(0, 100)
      };
    } catch (error: any) {
      results.tests.extraction = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
    
    // Test 3: Try direct pdf-parse import
    try {
      const pdf = await import('pdf-parse');
      results.tests.pdfParseImport = {
        success: true,
        hasDefault: !!pdf.default
      };
      
      // Try parsing
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = await pdf.default(buffer);
      
      results.tests.directParse = {
        success: true,
        textLength: data.text?.length || 0,
        numPages: data.numpages,
        hasText: !!data.text
      };
    } catch (error: any) {
      results.tests.directParse = {
        success: false,
        error: error.message,
        name: error.name,
        code: error.code
      };
    }
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[test-pdf] Error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
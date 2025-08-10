import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Polyfill for Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {}
  } as any;
}

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export async function POST(request: NextRequest) {
  console.log('[test-extraction] Starting test extraction');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    console.log(`[test-extraction] Processing ${file.name} (${file.size} bytes)`);
    
    // Extract text using pdfjs-dist
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    console.log(`[test-extraction] Extracted ${fullText.length} characters`);
    
    // If no text, try pdf-parse
    if (!fullText.trim()) {
      console.log('[test-extraction] Trying pdf-parse...');
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(Buffer.from(arrayBuffer));
      fullText = parsed.text || '';
    }
    
    // Return simple response
    return NextResponse.json({
      success: true,
      fileName: file.name,
      textLength: fullText.length,
      hasText: fullText.length > 0,
      firstChars: fullText.substring(0, 500),
      sampleFields: {
        po_number: 'PO-123456',
        customer_company: 'Test Company',
        square_footage: '1000'
      }
    });
    
  } catch (error: any) {
    console.error('[test-extraction] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
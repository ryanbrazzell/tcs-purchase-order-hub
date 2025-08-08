import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    console.log(`[test-pdf] Testing ${file.name} (${file.size} bytes)`);
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const analysis = {
      fileName: file.name,
      fileSize: file.size,
      numPages: pdf.numPages,
      pdfInfo: {} as any,
      pageAnalysis: [] as any[]
    };
    
    // Get PDF metadata
    const metadata = await pdf.getMetadata();
    analysis.pdfInfo = {
      title: metadata.info.Title || 'N/A',
      author: metadata.info.Author || 'N/A',
      subject: metadata.info.Subject || 'N/A',
      creator: metadata.info.Creator || 'N/A',
      producer: metadata.info.Producer || 'N/A',
      creationDate: metadata.info.CreationDate || 'N/A',
      modDate: metadata.info.ModDate || 'N/A'
    };
    
    // Analyze each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Count different types of content
      let textItemCount = 0;
      let totalChars = 0;
      let emptyItems = 0;
      let sampleText = [];
      
      for (const item of textContent.items) {
        textItemCount++;
        if (item.str) {
          totalChars += item.str.length;
          if (sampleText.length < 5) {
            sampleText.push(item.str);
          }
        } else {
          emptyItems++;
        }
      }
      
      // Check for fonts
      const fonts = new Set();
      for (const item of textContent.items) {
        if (item.fontName) {
          fonts.add(item.fontName);
        }
      }
      
      analysis.pageAnalysis.push({
        pageNumber: i,
        textItems: textItemCount,
        totalCharacters: totalChars,
        emptyItems: emptyItems,
        fonts: Array.from(fonts),
        sampleText: sampleText,
        hasText: totalChars > 0
      });
    }
    
    // Try alternative extraction method
    let alternativeText = '';
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(Buffer.from(arrayBuffer));
      alternativeText = parsed.text || '';
    } catch (e) {
      alternativeText = 'pdf-parse failed';
    }
    
    analysis['alternativeExtraction'] = {
      method: 'pdf-parse',
      textLength: alternativeText.length,
      firstChars: alternativeText.substring(0, 200)
    };
    
    return NextResponse.json(analysis);
    
  } catch (error: any) {
    console.error('[test-pdf] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to analyze PDF',
      stack: error.stack
    }, { status: 500 });
  }
}
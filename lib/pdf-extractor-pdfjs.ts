import { ExtractionError } from './errors';
import { PDFExtractionResult } from './pdf-extractor';

export async function extractTextFromPDFWithPdfJs(file: File): Promise<PDFExtractionResult> {
  try {
    console.log('[pdf-extractor-pdfjs] Starting extraction for file:', file.name);
    
    // Import PDF.js - use legacy build for better compatibility
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    
    // Disable worker to avoid issues in serverless environment
    pdfjsLib.GlobalWorkerOptions.workerSrc = false as any;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('[pdf-extractor-pdfjs] ArrayBuffer created, size:', arrayBuffer.byteLength);
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      verbosity: 0 // Reduce console output
    });
    
    const pdf = await loadingTask.promise;
    console.log('[pdf-extractor-pdfjs] PDF loaded, pages:', pdf.numPages);
    
    // Extract text from all pages
    let fullText = '';
    const pageTexts: string[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine text items
      const pageText = textContent.items
        .map((item: any) => (item as any).str || '')
        .join(' ');
      
      pageTexts.push(pageText);
      fullText += pageText + '\n\n';
    }
    
    console.log('[pdf-extractor-pdfjs] Text extraction complete, length:', fullText.length);
    
    if (!fullText || fullText.trim().length === 0) {
      throw new ExtractionError('No text content found in PDF. The PDF may be image-based or encrypted.');
    }
    
    // Get document info safely
    let docInfo: any = {};
    try {
      const metadata = await pdf.getMetadata();
      docInfo = metadata.info || {};
    } catch (e) {
      console.log('[pdf-extractor-pdfjs] Could not get metadata');
    }
    
    return {
      text: fullText,
      numPages: pdf.numPages,
      info: {
        title: docInfo.Title || '',
        author: docInfo.Author || '',
        subject: docInfo.Subject || '',
        keywords: docInfo.Keywords || ''
      }
    };
  } catch (error) {
    if (error instanceof ExtractionError) {
      throw error;
    }
    
    console.error('[pdf-extractor-pdfjs] Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        throw new ExtractionError('Invalid PDF file format');
      }
      if (error.message.includes('password')) {
        throw new ExtractionError('PDF is password protected');
      }
    }
    
    throw new ExtractionError('Failed to extract text from PDF. Please ensure the file is a valid PDF.');
  }
}
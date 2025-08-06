import { ExtractionError } from './errors';
import { extractTextFromPDFWithPdfJs } from './pdf-extractor-pdfjs';

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  info: any;
}

export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  console.log('[pdf-extractor] Starting extraction for file:', file.name);
  
  // Try pdf.js first as it's more reliable in serverless environments
  try {
    console.log('[pdf-extractor] Attempting extraction with PDF.js...');
    return await extractTextFromPDFWithPdfJs(file);
  } catch (pdfjsError) {
    console.error('[pdf-extractor] PDF.js extraction failed:', pdfjsError);
    
    // Fallback to pdf-parse
    try {
      console.log('[pdf-extractor] Falling back to pdf-parse...');
      
      // Dynamic import to avoid build issues
      const pdf = await import('pdf-parse');
      console.log('[pdf-extractor] pdf-parse module loaded');
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log('[pdf-extractor] ArrayBuffer created, size:', arrayBuffer.byteLength);
      
      const buffer = Buffer.from(arrayBuffer);
      console.log('[pdf-extractor] Buffer created, size:', buffer.length);
      
      // Parse PDF with error handling
      let data;
      try {
        data = await pdf.default(buffer);
        console.log('[pdf-extractor] PDF parsed successfully');
      } catch (parseError: any) {
        console.error('[pdf-extractor] pdf-parse failed:', {
          error: parseError.message,
          name: parseError.name,
          code: parseError.code,
          stack: parseError.stack
        });
        
        // Check if it's a specific error we can handle
        if (parseError.message?.includes('Invalid PDF structure')) {
          throw new ExtractionError('The PDF file appears to be corrupted or has an invalid structure');
        }
        
        throw parseError;
      }
      
      if (!data) {
        throw new ExtractionError('PDF parsing returned no data');
      }
      
      console.log('[pdf-extractor] Extraction result:', {
        hasText: !!data.text,
        textLength: data.text?.length || 0,
        numPages: data.numpages
      });
      
      if (!data.text || data.text.trim().length === 0) {
        throw new ExtractionError('No text content found in PDF. The PDF may be image-based or encrypted.');
      }
      
      return {
        text: data.text,
        numPages: data.numpages,
        info: data.info
      };
    } catch (error) {
      if (error instanceof ExtractionError) {
        throw error;
      }
      
      console.error('[pdf-extractor] Both extraction methods failed');
      console.error('[pdf-extractor] pdf-parse error:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('spawn') || error.message.includes('ENOENT')) {
          throw new ExtractionError('PDF processing tools are not available on the server');
        }
        if (error.message.includes('Invalid')) {
          throw new ExtractionError('Invalid PDF file format');
        }
      }
      
      throw new ExtractionError('Failed to extract text from PDF. Please ensure the file is a valid PDF.');
    }
  }
}

// Helper function to clean and normalize extracted text
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .replace(/\s{2,}/g, ' ') // Remove excessive spaces
    .trim();
}

// Helper function to extract sections from text
export function extractSection(text: string, startMarker: string, endMarker?: string): string {
  const startIndex = text.toLowerCase().indexOf(startMarker.toLowerCase());
  if (startIndex === -1) return '';
  
  const startPos = startIndex + startMarker.length;
  
  if (endMarker) {
    const endIndex = text.toLowerCase().indexOf(endMarker.toLowerCase(), startPos);
    if (endIndex === -1) return text.substring(startPos).trim();
    return text.substring(startPos, endIndex).trim();
  }
  
  return text.substring(startPos).trim();
}

// Helper function to extract key-value pairs
export function extractKeyValue(text: string, key: string): string {
  const patterns = [
    new RegExp(`${key}\\s*[:：]\\s*([^\\n]+)`, 'i'),
    new RegExp(`${key}\\s+([^\\n]+)`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return '';
}

// Helper function to extract email addresses
export function extractEmail(text: string): string {
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const match = text.match(emailPattern);
  return match ? match[1] : '';
}

// Helper function to extract phone numbers
export function extractPhone(text: string): string {
  // Match various phone formats
  const phonePatterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // (555) 555-5555 or 555-555-5555
    /\d{10}/, // 5555555555
  ];
  
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalize to 555-555-5555 format
      const cleaned = match[0].replace(/\D/g, '');
      if (cleaned.length === 10) {
        return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      }
    }
  }
  
  return '';
}

// Helper function to extract monetary values
export function extractMoney(text: string): number {
  const moneyPattern = /\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/;
  const match = text.match(moneyPattern);
  
  if (match && match[1]) {
    return parseFloat(match[1].replace(/,/g, ''));
  }
  
  return 0;
}

// Helper function to extract dates
export function extractDate(text: string): string {
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/, // MM/DD/YYYY or MM/DD/YY
    /(\d{1,2}-\d{1,2}-\d{2,4})/, // MM-DD-YYYY or MM-DD-YY
    /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/, // Month DD, YYYY
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return '';
}

// Helper function to extract line items from tables
export function extractLineItems(text: string): Array<{
  description: string;
  quantity?: number;
  unitPrice?: number;
}> {
  const items: Array<{ description: string; quantity?: number; unitPrice?: number }> = [];
  
  // Look for table-like patterns
  const lines = text.split('\n');
  const itemPattern = /(.+?)\s+(\d+(?:\.\d+)?)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/;
  
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match) {
      items.push({
        description: match[1].trim(),
        quantity: parseFloat(match[2]),
        unitPrice: parseFloat(match[3].replace(/,/g, ''))
      });
    }
  }
  
  return items;
}
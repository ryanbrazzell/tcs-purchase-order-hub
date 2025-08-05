import pdf from 'pdf-parse';
import { ExtractionError } from './errors';

export interface PDFExtractionResult {
  text: string;
  numPages: number;
  info: any;
}

export async function extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse PDF
    const data = await pdf(buffer);
    
    if (!data.text || data.text.trim().length === 0) {
      throw new ExtractionError('No text content found in PDF');
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
    
    console.error('PDF extraction error:', error);
    throw new ExtractionError('Failed to extract text from PDF');
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
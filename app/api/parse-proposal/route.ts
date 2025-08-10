import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import OpenAI from 'openai';
import { Logger } from '@/lib/logger';

const logger = new Logger('parse-proposal');

// Polyfill for Node.js
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {}
  } as any;
}

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Field schema
const FIELD_SCHEMA = {
  po_date: '',
  po_number: '',
  customer_first_name: '',
  customer_last_name: '',
  customer_company: '',
  onsite_contact_name: '',
  onsite_contact_phone: '',
  customer_phone: '',
  customer_email: '',
  billing_address: '',
  project_address: '',
  city: '',
  state: '',
  zip: '',
  service_type: '',
  floor_type: '',
  square_footage: '',
  unit_price: '',
  subtotal: '',
  tax: '',
  total: '',
  timeline: '',
  requested_service_date: '',
  special_requirements: '',
  doc_reference: '',
  notes: ''
};

export async function POST(request: NextRequest) {
  logger.info('Starting PDF parsing request');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      logger.error('No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    logger.info(`Processing ${file.name}`, { size: file.size, type: file.type });
    
    // Step 1: Extract text from PDF using pdfjs-dist
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    logger.info(`Extracting text from ${pdf.numPages} pages`);
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text items preserving structure
      const items = textContent.items as any[];
      let pageText = '';
      
      // Sort items by Y position (top to bottom) then X position (left to right)
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5]; // Note: Y coordinates are inverted in PDF
        if (Math.abs(yDiff) > 2) return yDiff;
        return a.transform[4] - b.transform[4]; // X coordinate for same line
      });
      
      let lastY = -1;
      let currentLine = '';
      
      for (const item of items) {
        const y = item.transform[5];
        
        // New line if Y position changed significantly
        if (lastY !== -1 && Math.abs(y - lastY) > 2) {
          if (currentLine.trim()) {
            pageText += currentLine.trim() + '\n';
          }
          currentLine = '';
        }
        
        // Add space if there's a gap between items on the same line
        if (currentLine && item.transform[4] > 0) {
          currentLine += ' ';
        }
        
        currentLine += item.str;
        lastY = y;
      }
      
      // Don't forget the last line
      if (currentLine.trim()) {
        pageText += currentLine.trim() + '\n';
      }
      
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    logger.info(`Extracted ${fullText.length} characters with pdfjs-dist`);
    logger.info('First 500 chars of extracted text', { text: fullText.substring(0, 500) });
    
    // If pdfjs-dist didn't get text, try pdf-parse as fallback
    if (!fullText.trim() || fullText.length < 100) {
      logger.info('Trying pdf-parse as fallback');
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const parsed = await pdfParse(Buffer.from(arrayBuffer));
        fullText = parsed.text || '';
        logger.info(`pdf-parse extracted ${fullText.length} characters`);
        logger.info('First 500 chars from pdf-parse', { text: fullText.substring(0, 500) });
      } catch (e) {
        logger.error('pdf-parse also failed', { error: e });
      }
    }
    
    if (!fullText.trim()) {
      logger.error('No text extracted from PDF');
      return NextResponse.json({ 
        error: 'No text found in PDF. The PDF may be a scanned image.',
        debug: {
          pdfPages: pdf.numPages,
          textLength: fullText.length
        }
      }, { status: 400 });
    }
    
    // Step 2: Send to OpenAI for field extraction
    logger.info('Sending to OpenAI for extraction');
    
    // Limit text to prevent token overflow
    const maxTextLength = 4000; // Roughly 1000 tokens
    const truncatedText = fullText.length > maxTextLength 
      ? fullText.substring(0, maxTextLength) + '\n\n[... text truncated for length ...]'
      : fullText;
    
    logger.info('Text length for OpenAI', { 
      original: fullText.length, 
      truncated: truncatedText.length 
    });
    
    const prompt = `Extract information from this TCS floor service proposal and return ONLY a JSON object with these fields:

${JSON.stringify(FIELD_SCHEMA, null, 2)}

Focus on finding:
- Customer/facility name (customer_company)
- Square footage numbers
- Service type (stripping, waxing, etc)
- Pricing (subtotal, tax, total)
- Addresses and contact info

Document text:
${truncatedText}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Extract data from documents into JSON. Return ONLY valid JSON, no other text.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      
      logger.info('OpenAI API call successful');
      const responseContent = completion.choices[0]?.message?.content;
      logger.info('Response content', { content: responseContent });
      logger.info('Response length', { length: responseContent?.length || 0 });
    
    if (!responseContent) {
      logger.error('Empty response from OpenAI');
      return NextResponse.json({ 
        error: 'Empty response from OpenAI',
        debug: { completion }
      }, { status: 500 });
    }
    
    let extractedData;
    try {
      extractedData = JSON.parse(responseContent);
      logger.info('Successfully parsed JSON', { keys: Object.keys(extractedData) });
    } catch (parseError: any) {
      logger.error('JSON parse error', { error: parseError.message });
      logger.error('Failed to parse response', { content: responseContent });
      return NextResponse.json({ 
        error: 'Failed to parse OpenAI response',
        debug: {
          parseError: parseError.message,
          responseContent: responseContent.substring(0, 500)
        }
      }, { status: 500 });
    }
    
    // Ensure all fields exist and add defaults
    const result = { ...FIELD_SCHEMA, ...extractedData };
    result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    result.po_date = result.po_date || new Date().toISOString().split('T')[0];
    
    logger.info('Extraction complete', { 
      fields: Object.keys(result),
      customer_company: result.customer_company,
      square_footage: result.square_footage
    });
    
    return NextResponse.json(result);
    
    } catch (openAIError: any) {
      logger.error('OpenAI API error', { 
        error: openAIError.message,
        response: openAIError.response?.data
      });
      
      return NextResponse.json({ 
        error: 'Failed to call OpenAI API',
        debug: {
          message: openAIError.message,
          type: openAIError.constructor.name,
          response: openAIError.response?.data
        }
      }, { status: 500 });
    }
    
  } catch (error: any) {
    logger.error('Unhandled error', { 
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: error.message || 'Failed to process PDF',
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack?.split('\n').slice(0, 5)
      }
    }, { status: 500 });
  }
}
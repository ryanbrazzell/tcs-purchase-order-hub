import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import OpenAI from 'openai';
import { ErrorReporter } from '@/lib/error-reporter';

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
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };
  
  try {
    debugInfo.steps.push({ step: 'Start', time: new Date().toISOString() });
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      debugInfo.error = 'No file uploaded';
      await ErrorReporter.report('parse-proposal-debug', new Error('No file uploaded'), debugInfo);
      return NextResponse.json({ error: 'No file uploaded', debug: debugInfo }, { status: 400 });
    }
    
    debugInfo.file = { name: file.name, size: file.size, type: file.type };
    debugInfo.steps.push({ step: 'File received', time: new Date().toISOString() });
    
    if (!process.env.OPENAI_API_KEY) {
      debugInfo.error = 'OpenAI API key not configured';
      await ErrorReporter.report('parse-proposal-debug', new Error('OpenAI API key not configured'), debugInfo);
      return NextResponse.json({ error: 'OpenAI API key not configured', debug: debugInfo }, { status: 500 });
    }
    
    // Step 1: Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    debugInfo.pdf = { pages: pdf.numPages };
    debugInfo.steps.push({ step: 'PDF loaded', time: new Date().toISOString() });
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];
      let pageText = '';
      
      items.sort((a, b) => {
        const yDiff = b.transform[5] - a.transform[5];
        if (Math.abs(yDiff) > 2) return yDiff;
        return a.transform[4] - b.transform[4];
      });
      
      let lastY = -1;
      let currentLine = '';
      
      for (const item of items) {
        const y = item.transform[5];
        if (lastY !== -1 && Math.abs(y - lastY) > 2) {
          if (currentLine.trim()) {
            pageText += currentLine.trim() + '\n';
          }
          currentLine = '';
        }
        if (currentLine && item.transform[4] > 0) {
          currentLine += ' ';
        }
        currentLine += item.str;
        lastY = y;
      }
      
      if (currentLine.trim()) {
        pageText += currentLine.trim() + '\n';
      }
      
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    debugInfo.extraction = {
      method: 'pdfjs-dist',
      textLength: fullText.length,
      firstChars: fullText.substring(0, 200)
    };
    debugInfo.steps.push({ step: 'Text extracted', time: new Date().toISOString() });
    
    // Try pdf-parse if needed
    if (!fullText.trim() || fullText.length < 100) {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const parsed = await pdfParse(Buffer.from(arrayBuffer));
        fullText = parsed.text || '';
        debugInfo.extraction = {
          method: 'pdf-parse',
          textLength: fullText.length,
          firstChars: fullText.substring(0, 200)
        };
      } catch (e) {
        debugInfo.pdfParseError = String(e);
      }
    }
    
    if (!fullText.trim()) {
      debugInfo.error = 'No text extracted from PDF';
      await ErrorReporter.report('parse-proposal-debug', new Error('No text extracted from PDF'), debugInfo);
      return NextResponse.json({ 
        error: 'No text found in PDF', 
        debug: debugInfo 
      }, { status: 400 });
    }
    
    // Step 2: Send to OpenAI
    const maxTextLength = 4000;
    const truncatedText = fullText.length > maxTextLength 
      ? fullText.substring(0, maxTextLength) + '\n\n[... truncated ...]'
      : fullText;
    
    debugInfo.openAI = {
      originalTextLength: fullText.length,
      truncatedTextLength: truncatedText.length,
      model: 'gpt-4o-mini'
    };
    
    const prompt = `Extract information from this TCS floor service proposal and return ONLY a JSON object with these fields:

${JSON.stringify(FIELD_SCHEMA, null, 2)}

Document text:
${truncatedText}`;

    debugInfo.steps.push({ step: 'Calling OpenAI', time: new Date().toISOString() });
    
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
      
      debugInfo.steps.push({ step: 'OpenAI responded', time: new Date().toISOString() });
      
      const responseContent = completion.choices[0]?.message?.content;
      debugInfo.openAIResponse = {
        hasContent: !!responseContent,
        contentLength: responseContent?.length || 0,
        content: responseContent
      };
      
      if (!responseContent) {
        debugInfo.error = 'Empty response from OpenAI';
        await ErrorReporter.report('parse-proposal-debug', new Error('Empty response from OpenAI'), debugInfo);
        return NextResponse.json({ 
          error: 'Empty response from OpenAI',
          debug: debugInfo
        }, { status: 500 });
      }
      
      let extractedData;
      try {
        extractedData = JSON.parse(responseContent);
        debugInfo.parsedFields = Object.keys(extractedData);
      } catch (parseError: any) {
        debugInfo.parseError = {
          message: parseError.message,
          responseContent: responseContent
        };
        await ErrorReporter.report('parse-proposal-debug', parseError, debugInfo);
        return NextResponse.json({ 
          error: 'Failed to parse OpenAI response',
          debug: debugInfo
        }, { status: 500 });
      }
      
      const result = { ...FIELD_SCHEMA, ...extractedData };
      result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      result.po_date = result.po_date || new Date().toISOString().split('T')[0];
      
      debugInfo.steps.push({ step: 'Success', time: new Date().toISOString() });
      debugInfo.result = {
        hasCustomerCompany: !!result.customer_company,
        hasSquareFootage: !!result.square_footage,
        fieldsSummary: Object.entries(result)
          .filter(([_, value]) => value)
          .map(([key, value]) => `${key}: ${String(value).substring(0, 50)}`)
      };
      
      return NextResponse.json({
        ...result,
        _debug: debugInfo
      });
      
    } catch (openAIError: any) {
      debugInfo.openAIError = {
        message: openAIError.message,
        type: openAIError.constructor.name,
        response: openAIError.response?.data
      };
      
      await ErrorReporter.report('parse-proposal-debug', openAIError, debugInfo);
      
      return NextResponse.json({ 
        error: 'Failed to call OpenAI API',
        debug: debugInfo
      }, { status: 500 });
    }
    
  } catch (error: any) {
    debugInfo.unhandledError = {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    };
    
    await ErrorReporter.report('parse-proposal-debug', error, debugInfo);
    
    return NextResponse.json({ 
      error: error.message || 'Failed to process PDF',
      debug: debugInfo
    }, { status: 500 });
  }
}
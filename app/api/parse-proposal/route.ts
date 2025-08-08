import { NextRequest, NextResponse } from 'next/server';
import * as pdfjsLib from 'pdfjs-dist';
import OpenAI from 'openai';

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
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    console.log(`[parse-proposal] Processing ${file.name}`);
    
    // Step 1: Extract text from PDF using pdfjs-dist
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    console.log(`[parse-proposal] Extracting text from ${pdf.numPages} pages...`);
    
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
    
    console.log(`[parse-proposal] Extracted ${fullText.length} characters with pdfjs-dist`);
    
    // If pdfjs-dist didn't get text, try pdf-parse as fallback
    if (!fullText.trim() || fullText.length < 100) {
      console.log('[parse-proposal] Trying pdf-parse as fallback...');
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const parsed = await pdfParse(Buffer.from(arrayBuffer));
        fullText = parsed.text || '';
        console.log(`[parse-proposal] pdf-parse extracted ${fullText.length} characters`);
      } catch (e) {
        console.error('[parse-proposal] pdf-parse also failed:', e);
      }
    }
    
    if (!fullText.trim()) {
      return NextResponse.json({ 
        error: 'No text found in PDF. The PDF may be a scanned image.' 
      }, { status: 400 });
    }
    
    // Step 2: Send to OpenAI for field extraction
    console.log('[parse-proposal] Sending to OpenAI for extraction...');
    
    const prompt = `You are analyzing a TCS floor service proposal/quote. Extract information and return ONLY valid JSON matching this structure:

${JSON.stringify(FIELD_SCHEMA, null, 2)}

Rules:
- Return ONLY the JSON object, no other text
- If a field is not found, use empty string ""
- Extract phone numbers in format "123-456-7890"
- Extract only numbers for square_footage (e.g., "8604")
- Look for:
  - Customer company name (the facility/organization receiving service)
  - Contact names and phone numbers
  - Job location/address
  - Square footage of floor area
  - Type of flooring (VCT, tile, etc)
  - Service description (stripping, waxing, etc)
  - Pricing information (subtotal, tax, total)
  - Timeline or requested dates
- For customer_company, look for facility names like "Hospital", "School", etc.
- For addresses, combine street, city, state, zip into appropriate fields

Document text:
${fullText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a data extraction expert. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: { type: 'json_object' }
    });
    
    const extractedData = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Ensure all fields exist and add defaults
    const result = { ...FIELD_SCHEMA, ...extractedData };
    result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    result.po_date = result.po_date || new Date().toISOString().split('T')[0];
    
    console.log('[parse-proposal] Extraction complete');
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('[parse-proposal] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process PDF' 
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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
    
    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let extractedText = '';
    try {
      // Dynamic import to avoid Vercel build issues
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      extractedText = data.text || '';
      console.log(`Extracted ${extractedText.length} characters from PDF`);
    } catch (pdfError: any) {
      console.error('PDF extraction failed:', pdfError);
      return NextResponse.json({ 
        error: 'Failed to extract text from PDF',
        details: pdfError.message
      }, { status: 400 });
    }
    
    if (!extractedText.trim()) {
      return NextResponse.json({ 
        error: 'No text found in PDF',
        details: 'The PDF might be a scanned image or corrupted'
      }, { status: 400 });
    }
    
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    // Send to OpenAI for field extraction
    console.log('Sending to OpenAI for extraction');
    
    // Limit text to prevent token overflow
    const maxTextLength = 4000; // Roughly 1000 tokens
    const truncatedText = extractedText.length > maxTextLength 
      ? extractedText.substring(0, maxTextLength) + '\n\n[... text truncated for length ...]'
      : extractedText;
    
    console.log('Text length for OpenAI', { 
      original: extractedText.length, 
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

    if (!openai) {
      console.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

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
      
      console.log('OpenAI API call successful');
      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        console.error('Empty response from OpenAI');
        return NextResponse.json({ 
          error: 'Empty response from OpenAI'
        }, { status: 500 });
      }
      
      let extractedData;
      try {
        extractedData = JSON.parse(responseContent);
        console.log('Successfully parsed JSON', { keys: Object.keys(extractedData) });
      } catch (parseError: any) {
        console.error('JSON parse error', { error: parseError.message });
        return NextResponse.json({ 
          error: 'Failed to parse OpenAI response',
          details: parseError.message
        }, { status: 500 });
      }
      
      // Ensure all fields exist and add defaults
      const result = { ...FIELD_SCHEMA, ...extractedData };
      result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      result.po_date = result.po_date || new Date().toISOString().split('T')[0];
      
      console.log('Extraction complete', { 
        customer_company: result.customer_company,
        square_footage: result.square_footage
      });
      
      return NextResponse.json(result);
      
    } catch (openAIError: any) {
      console.error('OpenAI API error', { 
        error: openAIError.message,
        response: openAIError.response?.data
      });
      
      return NextResponse.json({ 
        error: 'Failed to call OpenAI API',
        details: openAIError.message
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Request processing error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process request',
      stack: error.stack
    }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Field schema for extraction
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

function extractionPrompt(): string {
  return `
You are analyzing pages from a commercial floor-care proposal/quote document.
Extract ALL relevant information and return ONLY valid JSON (no markdown, no commentary) that matches this shape:

${JSON.stringify(FIELD_SCHEMA, null, 2)}

Rules:
- If a field is missing, set it to "".
- Normalize phone like "123-456-7890" if possible.
- Use numbers only for square_footage if present (e.g., "8604").
- If price per sqft is present, set unit_price; if lump sum only, leave unit_price empty and fill total/subtotal.
- Keep addresses on one line if present. 
- Accept that proposals vary; infer obvious values when explicitly stated (e.g., "Los Angeles, CA 90041" -> city/state/zip).
- Do not invent values not present in the document.
- Look for customer information, job details, pricing, and any special requirements.
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { images } = data;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    console.log(`[parse-proposal-vision] Processing ${images.length} page images`);
    
    try {
      // Build message content with all images
      const messageContent: any[] = [
        {
          type: 'text',
          text: extractionPrompt()
        }
      ];
      
      // Add each page image
      images.forEach((imageDataUrl: string, index: number) => {
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: imageDataUrl,
            detail: 'high'
          }
        });
      });
      
      // Extract information using Vision
      console.log('[parse-proposal-vision] Sending to OpenAI Vision...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are a document analysis expert. Extract information from the provided images and return only valid JSON.'
          },
          {
            role: 'user',
            content: messageContent
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });
      
      const finalJson = JSON.parse(completion.choices[0].message.content || '{}');
      
      // Ensure all keys exist
      const safeResult = { ...FIELD_SCHEMA, ...finalJson };
      
      // Add some TCS-specific defaults
      safeResult.po_number = safeResult.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      safeResult.po_date = safeResult.po_date || new Date().toISOString().split('T')[0];
      
      console.log('[parse-proposal-vision] Extraction complete');
      return NextResponse.json(safeResult);
      
    } catch (e: any) {
      console.error('[parse-proposal-vision] OpenAI error:', e.message);
      return NextResponse.json({ 
        error: 'Failed to process images with OpenAI Vision. Please try again.' 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('[parse-proposal-vision] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
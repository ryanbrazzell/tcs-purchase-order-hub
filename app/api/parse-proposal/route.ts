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

// Helper to chunk text if too long
const chunk = (text: string, maxLength: number = 12000): string[] => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.slice(i, i + maxLength));
  }
  return chunks;
};

function extractionPrompt(pdfText: string): string {
  return `
You are a precise information extractor for commercial floor-care proposals.
Return ONLY valid JSON (no markdown, no commentary) that matches this shape:

${JSON.stringify(FIELD_SCHEMA, null, 2)}

Rules:
- If a field is missing, set it to "".
- Normalize phone like "123-456-7890" if possible.
- Use numbers only for square_footage if present (e.g., "8604").
- If price per sqft is present, set unit_price; if lump sum only, leave unit_price empty and fill total/subtotal.
- Keep addresses on one line if present. 
- Accept that proposals vary; infer obvious values when explicitly stated (e.g., "Los Angeles, CA 90041" -> city/state/zip).
- Do not invent values not present in the text.

PDF CONTENT START
${pdfText}
PDF CONTENT END
`.trim();
}

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
    
    console.log(`[parse-proposal] Processing ${file.name} (${file.size} bytes)`);
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text using pdf-parse
    let text = '';
    try {
      // Dynamic import to avoid build issues
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      text = parsed.text?.trim() || '';
      console.log(`[parse-proposal] Extracted ${text.length} characters with pdf-parse`);
    } catch (e: any) {
      console.error('[parse-proposal] pdf-parse failed:', e.message);
      return NextResponse.json({ 
        error: 'Failed to extract text from PDF. Please ensure the PDF contains selectable text (not a scanned image).' 
      }, { status: 400 });
    }
    
    if (!text) {
      return NextResponse.json({ 
        error: 'No text found in PDF. The PDF may be a scanned image or corrupted.' 
      }, { status: 400 });
    }
    
    // ChatGPT structured extraction (chunk if needed)
    const parts = chunk(text);
    let finalJson: any;
    
    try {
      if (parts.length === 1) {
        console.log('[parse-proposal] Single chunk, extracting directly...');
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You return only strict JSON.' },
            { role: 'user', content: extractionPrompt(parts[0]) }
          ],
          temperature: 0.1
        });
        finalJson = JSON.parse(completion.choices[0].message.content || '{}');
      } else {
        console.log(`[parse-proposal] ${parts.length} chunks, summarizing first...`);
        // Summarize chunks → merge
        const summaries: string[] = [];
        for (let i = 0; i < parts.length; i++) {
          const c = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Summarize only factual details relevant to PO mapping.' },
              { role: 'user', content: `Chunk ${i+1}/${parts.length}:\n${parts[i]}` }
            ],
            temperature: 0.1
          });
          summaries.push(c.choices[0].message.content || '');
        }
        
        const merged = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Return only strict JSON.' },
            { role: 'user', content: extractionPrompt(summaries.join('\n---\n')) }
          ],
          temperature: 0.1
        });
        finalJson = JSON.parse(merged.choices[0].message.content || '{}');
      }
    } catch (e: any) {
      console.error('[parse-proposal] OpenAI error:', e.message);
      return NextResponse.json({ 
        error: 'Failed to process text with OpenAI. Please check your API key and try again.' 
      }, { status: 500 });
    }
    
    // Ensure all keys exist
    const safeResult = { ...FIELD_SCHEMA, ...finalJson };
    
    // Add some TCS-specific defaults
    safeResult.po_number = safeResult.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    safeResult.po_date = safeResult.po_date || new Date().toISOString().split('T')[0];
    
    console.log('[parse-proposal] Extraction complete');
    return NextResponse.json(safeResult);
    
  } catch (error: any) {
    console.error('[parse-proposal] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
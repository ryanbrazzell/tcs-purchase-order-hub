import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Same field schema as PDF parsing for consistency
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
  service_description: '',
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
  notes: '',
  subcontractor_company: '',
  subcontractor_contact: '',
  subcontractor_phone: '',
  subcontractor_email: '',
  subcontractor_address: '',
  subcontractor_city: '',
  subcontractor_state: '',
  subcontractor_zip: '',
  line_item_1_desc: '',
  line_item_1_price: '',
  line_item_2_desc: '',
  line_item_2_price: '',
  line_item_3_desc: '',
  line_item_3_price: '',
  line_item_4_desc: '',
  line_item_4_price: '',
  line_item_5_desc: '',
  line_item_5_price: ''
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file uploaded' }, { status: 400 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!openai) {
      console.error('OpenAI client not initialized');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    console.log('Processing voice recording:', audioFile.name, 'Size:', audioFile.size);
    
    try {
      // Step 1: Transcribe audio using Whisper
      console.log('Starting Whisper transcription...');
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
        prompt: 'This is a recording about a floor service job including details about square footage, floor type, timeline, customer information, and special requirements.'
      });
      
      console.log('Transcription completed, length:', transcription.length);
      
      if (!transcription || transcription.trim().length === 0) {
        return NextResponse.json({ 
          error: 'No speech detected in audio recording',
          details: 'Please try recording again with clearer audio'
        }, { status: 400 });
      }
      
      // Step 2: Extract structured data from transcription using optimized prompt
      console.log('Starting data extraction from transcription...');
      
      const extractionPrompt = `You are a floor service operations expert who extracts structured data from voice recordings about floor service jobs.

VOICE TRANSCRIPTION TO ANALYZE:
"${transcription}"

CRITICAL EXTRACTION TASK:
Extract job details from this voice recording and populate ONLY the relevant fields. Leave fields empty if not mentioned in the recording.

EXTRACTION PRIORITIES:
1. CUSTOMER INFO: Company name, contact person, phone number, email if mentioned
2. JOB SITE: Address, city, state, ZIP code if provided
3. SERVICE DETAILS: Floor type (VCT, carpet, hard surface), square footage, service type
4. TIMELINE: Requested dates, deadlines, scheduling requirements
5. SPECIAL REQUIREMENTS: Access needs, timing restrictions, environmental concerns
6. PRICING: Any costs or budget numbers mentioned

VOICE-SPECIFIC EXTRACTION RULES:
- Extract only information explicitly mentioned in the recording
- Use context clues to determine field placement (e.g., "we need 5,000 square feet done" → square_footage: "5000")
- If pricing mentioned, try to break into appropriate line items
- Put general service info in service_description field
- Capture any special instructions in special_requirements or notes

Return ONLY valid JSON using this exact schema:
${JSON.stringify(FIELD_SCHEMA, null, 2)}

EXAMPLE EXTRACTION:
Voice: "We need VCT floors stripped and waxed at ABC Company, about 3,000 square feet. The contact is John Smith at 555-1234. We need it done next Friday and they want low-odor products."

Result: {
  "customer_company": "ABC Company",
  "onsite_contact_name": "John Smith", 
  "customer_phone": "555-1234",
  "floor_type": "VCT",
  "square_footage": "3000",
  "service_type": "Floor Stripping and Waxing",
  "service_description": "VCT floors stripped and waxed using low-odor products",
  "requested_service_date": "next Friday",
  "special_requirements": "Use low-odor products"
}

Extract from the voice transcription above:`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a floor service data extraction expert. Extract structured information from voice transcriptions about floor service jobs. Return ONLY valid JSON with the exact field names provided.' 
          },
          { role: 'user', content: extractionPrompt }
        ],
        temperature: 0,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });
      
      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        console.error('Empty response from OpenAI extraction');
        return NextResponse.json({ error: 'Failed to extract data from voice recording' }, { status: 500 });
      }
      
      let extractedData;
      try {
        extractedData = JSON.parse(responseContent);
        console.log('Successfully parsed extraction data', { keys: Object.keys(extractedData) });
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError);
        return NextResponse.json({ 
          error: 'Failed to parse extraction results',
          details: parseError.message
        }, { status: 500 });
      }
      
      // Ensure all fields exist and add defaults
      const result = { ...FIELD_SCHEMA, ...extractedData };
      result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      result.po_date = result.po_date || new Date().toISOString().split('T')[0];
      
      // Add voice recording indicator
      result.doc_reference = result.doc_reference || 'Voice Recording';
      
      console.log('Voice extraction complete', {
        transcriptionLength: transcription.length,
        fieldsExtracted: Object.keys(extractedData).length,
        customerCompany: result.customer_company,
        serviceType: result.service_type,
        squareFootage: result.square_footage
      });
      
      return NextResponse.json({
        success: true,
        transcription,
        extractedData: result,
        metadata: {
          transcriptionLength: transcription.length,
          fieldsExtracted: Object.keys(extractedData).filter(key => extractedData[key]).length,
          processingTime: new Date().toISOString()
        }
      });
      
    } catch (openAIError: any) {
      console.error('OpenAI API error:', openAIError);
      
      if (openAIError.code === 'invalid_request_error') {
        return NextResponse.json({ 
          error: 'Audio file format not supported',
          details: 'Please try recording again in a supported format'
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to process voice recording',
        details: openAIError.message
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Request processing error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process voice recording',
      stack: error.stack
    }, { status: 500 });
  }
}
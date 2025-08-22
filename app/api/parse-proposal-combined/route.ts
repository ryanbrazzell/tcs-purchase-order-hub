import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Same field schema for consistency
const FIELD_SCHEMA = {
  po_date: '',
  po_number: '',
  customer_first_name: '',
  customer_last_name: '',
  customer_company: '',
  onsite_contact_name: '',
  onsite_contact_phone: '',
  customer_phone: '',
  project_address: '',
  city: '',
  state: '',
  zip: '',
  service_type: '',
  service_description: '',
  floor_type: '',
  square_footage: '',
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
  line_item_5_price: '',
  total: ''
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const voiceFile = formData.get('voice') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!openai) {
      console.error('OpenAI client not initialized');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    console.log('Processing combined extraction:', {
      pdfName: file.name,
      pdfSize: file.size,
      hasVoice: !!voiceFile,
      voiceSize: voiceFile?.size
    });
    
    try {
      // Step 1: Extract PDF text
      console.log('Starting PDF text extraction...');
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Use OpenAI's vision model to extract text from PDF
      const base64Pdf = buffer.toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64Pdf}`;
      
      // Step 2: Process voice transcription if provided
      let voiceTranscription = '';
      if (voiceFile) {
        console.log('Processing voice transcription...');
        
        try {
          const transcription = await openai.audio.transcriptions.create({
            file: voiceFile,
            model: 'whisper-1',
            language: 'en',
            response_format: 'text',
            prompt: 'This is a recording about a floor service job including details about square footage, floor type, timeline, customer information, and special requirements.'
          });
          
          voiceTranscription = transcription || '';
          console.log('Voice transcription completed, length:', voiceTranscription.length);
        } catch (voiceError: any) {
          console.warn('Voice transcription failed, continuing with PDF only:', voiceError.message);
          // Continue with PDF only if voice fails
        }
      }
      
      // Step 3: Combined data extraction from PDF and voice
      console.log('Starting combined data extraction...');
      
      const extractionPrompt = `You are a floor service operations expert who extracts structured data from proposal documents and voice recordings to create detailed purchase orders.

${voiceTranscription ? `VOICE TRANSCRIPTION CONTEXT:
"${voiceTranscription}"

VOICE GUIDANCE: Use the voice recording above to provide additional context, fill missing details, or clarify ambiguous information from the PDF. The voice note may contain customer preferences, site logistics, timing details, or special requirements not in the PDF.` : ''}

EXTRACTION TASK:
Extract all relevant information from the proposal PDF${voiceTranscription ? ' and voice context' : ''} to populate purchase order fields. Focus on:

PRIMARY DATA SOURCES:
1. Customer Information: Company name, contacts, phone numbers, addresses
2. Job Site Details: Service address, city, state, ZIP code
3. Service Specifications: Floor type, square footage, service description
4. Timeline: Requested dates, deadlines, scheduling requirements
5. Pricing: Line items, costs, totals
6. Special Requirements: Access needs, timing restrictions, material specifications
7. Subcontractor Info: Company details if mentioned

${voiceTranscription ? `VOICE-ENHANCED EXTRACTION RULES:
- Prioritize voice details for clarification of ambiguous PDF content
- Use voice context to enhance service descriptions and special requirements
- Fill gaps in PDF data using voice information
- Combine both sources for maximum context and completeness` : ''}

EXTRACTION PRIORITIES:
1. Parse all text content from the PDF proposal
2. Identify customer company, contact person, phone/email
3. Extract job site address and location details
4. Determine floor type (VCT, carpet, hard surface, etc.) and square footage
5. Identify service type and detailed description
6. Extract timeline and requested service dates
7. Parse pricing information and line items
8. Capture special requirements, access needs, or restrictions
9. Identify any subcontractor or vendor information

Return ONLY valid JSON using this exact schema:
${JSON.stringify(FIELD_SCHEMA, null, 2)}

Extract comprehensive data from the proposal${voiceTranscription ? ' and voice context' : ''}:`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a floor service data extraction expert. Extract structured information from proposal documents and optional voice recordings to create detailed purchase orders. Return ONLY valid JSON with exact field names provided.' 
          },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: extractionPrompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ],
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      });
      
      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        console.error('Empty response from OpenAI extraction');
        return NextResponse.json({ error: 'Failed to extract data from documents' }, { status: 500 });
      }
      
      let extractedData;
      try {
        extractedData = JSON.parse(responseContent);
        console.log('Successfully parsed combined extraction data', { 
          keys: Object.keys(extractedData),
          hasVoiceContext: !!voiceTranscription
        });
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
      
      // Add document reference
      result.doc_reference = voiceTranscription 
        ? `${file.name} + Voice Recording`
        : file.name;
      
      console.log('Combined extraction complete', {
        pdfName: file.name,
        hasVoice: !!voiceTranscription,
        voiceLength: voiceTranscription.length,
        fieldsExtracted: Object.keys(extractedData).length,
        customerCompany: result.customer_company,
        serviceType: result.service_type,
        squareFootage: result.square_footage
      });
      
      return NextResponse.json(result);
      
    } catch (openAIError: any) {
      console.error('OpenAI API error:', openAIError);
      
      if (openAIError.code === 'invalid_request_error') {
        return NextResponse.json({ 
          error: 'Invalid file format',
          details: 'Please check that the PDF is valid and voice recording is in a supported format'
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to process documents',
        details: openAIError.message
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Request processing error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process documents',
      stack: error.stack
    }, { status: 500 });
  }
}
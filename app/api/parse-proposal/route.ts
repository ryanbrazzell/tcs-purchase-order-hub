import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Field schema - includes service_description for package selection
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
  service_description: '', // This will hold the selected package details
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
  // Subcontractor fields (usually filled manually)
  subcontractor_company: '',
  subcontractor_contact: '',
  subcontractor_phone: '',
  subcontractor_email: '',
  subcontractor_address: '',
  subcontractor_city: '',
  subcontractor_state: '',
  subcontractor_zip: '',
  // Line item fields for pricing
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
    
    const prompt = `You are a floor service operations expert who transforms customer sales proposals into detailed subcontractor work instructions.

CRITICAL TASK: Extract customer package selections and convert them into specific, actionable work orders for expert floor maintenance subcontractors.

CRITICAL ANALYSIS WORKFLOW:
1. IDENTIFY SPECIFIC PACKAGE NUMBERS: Look for "Package 1", "Package 2", "Package 3" etc. and identify EXACTLY which package number is selected
2. IDENTIFY SELECTED OPTIONS: Within the chosen package, identify specific options like "Option 3", "Option 4" that are marked as selected
3. EXTRACT ONLY SELECTED ITEMS: Only extract pricing and details for the specific package number and options that are actually selected
4. CROSS-REFERENCE PACKAGE DETAILS: Match the selected package number with its detailed service descriptions
5. CALCULATE SPECIFICATIONS: Use only the selected package's square footage, materials, and pricing
6. EXTRACT SITE NUANCES: Capture ALL logistical details, timing restrictions, and customer-specific requirements
7. GENERATE WORK INSTRUCTIONS: Create detailed instructions based ONLY on the selected package and options

FLOOR SERVICE KNOWLEDGE BASE:
- VCT Flooring: Requires stripping (high-quality commercial-grade strippers), cleaning, multiple finish coats (2-4 typically), buffing
- Carpet Care: Deep cleaning, spot treatment, protection application, drying time considerations
- Hard Surface: Mopping systems, finish application, maintenance schedules
- Premium packages typically include: more frequent service, premium materials, additional protective coatings
- Standard packages: basic cleaning, standard materials, routine maintenance
- Basic packages: minimal service, economy materials

SITE-SPECIFIC DETAILS TO PRESERVE:
- Furniture/equipment moving requirements and responsibilities
- Access coordination (keys, codes, security, timing)
- Environmental restrictions (low-odor products, air quality concerns)
- Timing constraints (business hours, weekend work, deadlines)
- Protection needs (artwork, electronics, sensitive areas)
- Customer preferences and concerns
- Special handling requirements

PACKAGE SELECTION RULES:
- Look for checkmarks (✓), [X], highlighting, circles, or "SELECTED" text next to package numbers
- "Package 1" selected → Extract only Package 1 pricing and services
- "Package 2, Options 3+4" selected → Extract Package 2 base + Options 3 and 4 pricing
- "Package 3" selected → Extract only Package 3 pricing and services
- CRITICAL: If multiple packages are shown but only one is selected, ignore the unselected packages completely
- Always verify package number matches selection indicators before extracting pricing

Return ONLY valid JSON using this schema:
${JSON.stringify(FIELD_SCHEMA, null, 2)}

For service_description field, provide comprehensive subcontractor work instructions that include:
- Step-by-step work process
- High-quality commercial-grade materials (no specific brands)
- Square footage and coverage details
- Completion criteria and quality standards
- All site-specific logistics and customer requirements from the proposal

EXAMPLE TRANSFORMATION:
Proposal shows: "Package 1: Basic Service $2,000 [not selected] | Package 2: Premium Service $4,500 ✓ SELECTED + Option 3: Extra Wax $300 ✓ + Option 4: Weekend Work $200 ✓"
Extraction result: Only extract Package 2 ($4,500) + Option 3 ($300) + Option 4 ($200) = Total $5,000. IGNORE Package 1 completely.
Subcontractor gets: "Premium Service with extra wax coating and weekend scheduling. LOGISTICS: Weekend work as selected in Option 4..."

CRITICAL: If proposal shows multiple packages but customer selected "Package 2, Options 3 and 4" - extract ONLY Package 2 base price + Option 3 price + Option 4 price. Do NOT include pricing from Package 1 or Package 3.

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
            content: 'You are a floor service operations expert specializing in transforming customer proposals into detailed subcontractor work orders. Focus on preserving ALL site-specific details, customer requirements, and logistical nuances while converting customer-facing package names into specific contractor instructions. Return ONLY valid JSON.' 
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
      
      // If service_description is empty but service_type exists, use service_type as fallback
      if (!result.service_description && result.service_type) {
        console.warn('No package selection found, using service_type as fallback');
        result.service_description = result.service_type;
      }
      
      console.log('Extraction complete', { 
        customer_company: result.customer_company,
        square_footage: result.square_footage,
        service_type: result.service_type,
        service_description: result.service_description ? 
          result.service_description.substring(0, 100) + '...' : 'NOT FOUND'
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
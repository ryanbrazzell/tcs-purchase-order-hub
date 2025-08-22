import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Same field schema as the main endpoints
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
    const body = await request.json();
    const { extractedText } = body;
    
    if (!extractedText) {
      return NextResponse.json({ error: 'No extractedText provided' }, { status: 400 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!openai) {
      return NextResponse.json({ error: 'OpenAI client not initialized' }, { status: 500 });
    }
    
    console.log('Testing optimized prompt with text length:', extractedText.length);
    
    const prompt = `You are a floor service operations expert who transforms customer sales proposals into detailed subcontractor work instructions.

CRITICAL TASK: Extract customer package selections and convert them into specific, actionable work orders for expert floor maintenance subcontractors.

ANALYSIS WORKFLOW:
1. IDENTIFY SELECTED PACKAGES: Look for "Package Selection", "Service Selection", or similar sections showing what the customer chose
2. CROSS-REFERENCE DETAILS: Match selected packages with detailed service descriptions elsewhere in the proposal
3. EXTRACT ADD-ONS: Identify any optional services or modifications selected
4. CALCULATE SPECIFICATIONS: Determine square footage, materials, and techniques required
5. EXTRACT SITE NUANCES: Capture ALL logistical details, timing restrictions, and customer-specific requirements
6. GENERATE WORK INSTRUCTIONS: Create detailed, step-by-step contractor instructions

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

TRANSFORMATION RULES:
- "Premium Floor Care Package" → Detailed VCT stripping protocol with premium finish (3-4 coats)
- "Standard Maintenance" → Regular cleaning with standard materials (2-3 coats)
- "Deep Clean Service" → Complete strip and refinish with specific requirements
- Always include: square footage, specific materials, number of coats, completion criteria, site logistics

Return ONLY valid JSON using this schema:
${JSON.stringify(FIELD_SCHEMA, null, 2)}

For service_description field, provide comprehensive subcontractor work instructions that include:
- Step-by-step work process
- High-quality commercial-grade materials (no specific brands)
- Square footage and coverage details
- Completion criteria and quality standards
- All site-specific logistics and customer requirements from the proposal

EXAMPLE TRANSFORMATION:
Customer sees: "Premium Floor Care Package for 5,000 sq ft office. Work on weekend only. Move furniture to conference room. Use low-odor products."
Subcontractor gets: "Strip 5,000 sq ft VCT flooring using high-quality commercial-grade stripper. Clean thoroughly, apply 3 coats high-traffic floor finish with 2-hour cure time between coats. Buff to high-gloss finish. LOGISTICS: Weekend work only. Move all furniture to conference room before starting. Use low-odor products due to customer requirement. Estimated time: 8-10 hours over 2 days."

Document text:
${extractedText}`;

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
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });
    
    const responseContent = completion.choices[0]?.message?.content;
    
    if (!responseContent) {
      return NextResponse.json({ error: 'Empty response from OpenAI' }, { status: 500 });
    }
    
    let extractedData;
    try {
      extractedData = JSON.parse(responseContent);
    } catch (parseError: any) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ 
        error: 'Failed to parse OpenAI response',
        details: parseError.message,
        rawResponse: responseContent
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
    
    console.log('✅ Test parsing successful');
    console.log('Service description length:', result.service_description?.length || 0);
    console.log('Line items populated:', [
      result.line_item_1_desc,
      result.line_item_2_desc, 
      result.line_item_3_desc,
      result.line_item_4_desc,
      result.line_item_5_desc
    ].filter(Boolean).length);
    
    return NextResponse.json({
      success: true,
      result,
      metadata: {
        serviceDescriptionLength: result.service_description?.length || 0,
        lineItemsPopulated: [
          result.line_item_1_desc,
          result.line_item_2_desc, 
          result.line_item_3_desc,
          result.line_item_4_desc,
          result.line_item_5_desc
        ].filter(Boolean).length,
        hasLogistics: result.service_description?.includes('weekend') || 
                     result.service_description?.includes('furniture') ||
                     result.service_description?.includes('artwork') ||
                     result.service_description?.includes('low-odor') ||
                     result.service_description?.includes('LOGISTICS')
      }
    });
    
  } catch (error: any) {
    console.error('Test parsing error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process test request',
      stack: error.stack
    }, { status: 500 });
  }
}
import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { createErrorResponse, createSuccessResponse } from '@/lib/error-response';

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
  customer_email: '',
  billing_address: '',
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

interface UploadedFile {
  id: string;
}

interface Assistant {
  id: string;
}

export async function POST(request: NextRequest) {
  let uploadedFile: UploadedFile | null = null;
  let assistant: Assistant | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return createErrorResponse('No file uploaded', 400);
    }
    
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return createErrorResponse('OpenAI API key not configured', 500);
    }
    
    console.log('Processing file:', file.name, 'Size:', file.size);
    
    if (!openai) {
      console.error('OpenAI client not initialized - API key missing');
      return createErrorResponse('OpenAI API key not configured', 500);
    }
    
    try {
      // Convert File to a format OpenAI accepts
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create a File object that OpenAI can accept
      const openAIFile = new File([buffer], file.name, { type: 'application/pdf' });
      
      console.log('Uploading file to OpenAI...');
      
      // Upload file to OpenAI
      uploadedFile = await openai.files.create({
        file: openAIFile,
        purpose: 'assistants'
      });
      
      console.log('File uploaded to OpenAI:', uploadedFile.id);
      
      // Create an assistant that can read files
      assistant = await openai.beta.assistants.create({
        name: 'PDF Data Extractor',
        instructions: `You are a floor service operations expert who transforms customer sales proposals into detailed subcontractor work instructions.

CRITICAL OBJECTIVES:
1. Identify exactly which floor service packages the customer selected
2. Convert customer-facing package names into specific contractor work instructions
3. Extract square footage, materials, and completion requirements
4. Preserve ALL site-specific nuances and customer requirements
5. Generate comprehensive work orders for expert subcontractors

ANALYSIS STEPS:

STEP 1 - SPECIFIC PACKAGE IDENTIFICATION:
- Find sections with numbered packages ("Package 1", "Package 2", "Package 3", etc.)
- Look for selection indicators: checkmarks (✓), [X], highlighting, circles, "SELECTED" text
- Identify the EXACT package number that is selected (e.g., "Package 2")
- Within selected package, identify specific options selected (e.g., "Option 3", "Option 4")
- CRITICAL: Only extract data from the selected package number, ignore all other packages

STEP 2 - SERVICE TRANSLATION:
Transform customer packages using this knowledge:

FLOOR TYPES & REQUIREMENTS:
• VCT (Vinyl Composite Tile): Strip with commercial stripper → Clean → Apply 2-4 coats finish → Buff
• Carpet: Vacuum → Pre-treat stains → Deep clean → Apply protectant → Dry
• Hard Surfaces: Sweep → Mop with appropriate cleaner → Apply finish if specified

SERVICE LEVELS:
• Premium: Use high-quality materials, extra coats, additional services, frequent maintenance
• Standard: Standard materials, normal coat application, regular maintenance
• Basic: Economy materials, minimum coats, basic maintenance

STEP 3 - SELECTED PACKAGE PRICING:
Extract pricing ONLY from the selected package:
- Base price for selected package number
- Additional costs for selected options within that package
- IGNORE pricing from unselected packages
- Calculate total based only on selected items

STEP 4 - SITE-SPECIFIC DETAILS:
Extract and preserve ALL logistical requirements:
- Furniture/equipment moving (what, who, where)
- Access coordination (keys, codes, security, timing)
- Environmental restrictions (low-odor, air quality)
- Timing constraints (business hours, weekends, deadlines)
- Protection needs (artwork, electronics, sensitive areas)
- Customer preferences and special concerns

STEP 5 - WORK ORDER CREATION:
For each service area, provide:
- Exact square footage
- Step-by-step work process
- High-quality commercial-grade materials (no specific brands)
- Number of coats/applications
- Completion verification criteria
- Time estimates
- All site logistics and customer requirements

Return data in this exact JSON format: ${JSON.stringify(FIELD_SCHEMA, null, 2)}

For service_description field, create comprehensive subcontractor instructions like:
"VCT Floor Renewal - 3,500 sq ft: 1) Strip existing finish using high-quality commercial-grade stripper. 2) Neutralize and clean thoroughly. 3) Apply 3 coats high-traffic floor finish with 2-hour cure between coats. 4) Buff final coat to high-gloss finish. SITE LOGISTICS: Weekend work only. Move all office furniture to hallway before starting. Use low-odor products due to employee sensitivities. Protect reception artwork with plastic sheeting. Time: 10-12 hours over 2 days."

CRITICAL PACKAGE SELECTION EXAMPLE:
If proposal shows multiple packages like:
"Package 1: Basic Clean $2,000
 Package 2: Deep Clean $4,500 ✓ SELECTED
   → Option 3: Extra Protection $300 ✓
   → Option 4: Weekend Service $200 ✓
 Package 3: Premium $6,000"

Extract ONLY: Package 2 base ($4,500) + Option 3 ($300) + Option 4 ($200) = $5,000 total
IGNORE: Package 1 and Package 3 completely

Focus on being extremely specific - subcontractors are experts but need comprehensive instructions to match exact customer expectations and handle all site-specific requirements.`,
        tools: [{ type: 'file_search' }],
        model: 'gpt-4o-mini'
      });
      
      console.log('Assistant created:', assistant.id);
      
      // Create a thread and attach the file
      const thread = await openai.beta.threads.create({
        messages: [{
          role: 'user',
          content: `FLOOR SERVICE PROPOSAL ANALYSIS & SUBCONTRACTOR WORK ORDER GENERATION

Analyze this customer sales proposal and transform it into detailed work instructions for subcontractor purchase orders.

CRITICAL REQUIREMENTS:
1. Identify exactly which floor service packages the customer selected from Package Selection sections
2. Convert customer-facing package names into specific contractor work instructions
3. Extract ALL site-specific logistics, timing requirements, and customer preferences
4. Generate comprehensive subcontractor work orders with step-by-step instructions

FOCUS AREAS:
- Package Selection sections showing customer choices (checkmarks, highlighting, "SELECTED")
- Site logistics: furniture moving, access coordination, timing restrictions
- Environmental requirements: low-odor products, air quality concerns
- Customer preferences: finish types, protection needs, special handling
- Square footage, materials, and completion criteria

TRANSFORM customer package selections into detailed work instructions that include:
- Step-by-step work processes
- High-quality commercial-grade materials (no specific brands)
- All site-specific logistics from the original proposal
- Completion criteria and quality standards
- Time estimates and scheduling requirements

Return comprehensive JSON data with exact field names specified, focusing on service_description field containing complete subcontractor work instructions.`,
          attachments: [{
            file_id: uploadedFile.id,
            tools: [{ type: 'file_search' }]
          }]
        }]
      });
      
      console.log('Thread created:', thread.id);
      
      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id
      });
      
      console.log('Run created:', run.id);
      
      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
        console.log('Run status:', runStatus.status);
      }
      
      if (runStatus.status === 'failed') {
        console.error('Run failed:', runStatus);
        throw new Error('OpenAI processing failed');
      }
      
      // Get the messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');
      
      if (!assistantMessage || !assistantMessage.content[0]) {
        throw new Error('No response from assistant');
      }
      
      const textContent = assistantMessage.content[0];
      if (textContent.type !== 'text') {
        throw new Error('Unexpected response type');
      }
      
      console.log('Assistant response:', textContent.text.value);
      
      // Parse the JSON response
      let extractedData;
      try {
        // Extract JSON from the response (in case it's wrapped in markdown)
        const jsonMatch = textContent.text.value.match(/```json\n?([\s\S]*?)\n?```/) || 
                          textContent.text.value.match(/{[\s\S]*}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text.value;
        extractedData = JSON.parse(jsonStr);
      } catch (parseError: any) {
        console.error('Failed to parse assistant response as JSON:', parseError);
        throw new Error('Failed to parse extraction results');
      }
      
      // Cleanup will happen in finally block
      
      // Ensure all fields exist and add defaults
      const result = { ...FIELD_SCHEMA, ...extractedData };
      result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      result.po_date = result.po_date || new Date().toISOString().split('T')[0];
      
      // If service_description is empty but service_type exists, use service_type as fallback
      if (!result.service_description && result.service_type) {
        console.warn('No package selection found, using service_type as fallback');
        result.service_description = result.service_type;
      }
      
      // Log extraction results for monitoring
      console.log('Extracted service info:', {
        service_type: result.service_type,
        service_description: result.service_description ? 
          result.service_description.substring(0, 100) + '...' : 'NOT FOUND'
      });
      
      console.log('Extraction complete');
      
      return createSuccessResponse(result);
      
    } catch (openAIError: any) {
      console.error('OpenAI error:', openAIError);
      return createErrorResponse(
        'Failed to process PDF with OpenAI',
        500,
        openAIError.message
      );
    } finally {
      // Clean up resources even if an error occurred
      const cleanupPromises = [];
      
      if (uploadedFile) {
        cleanupPromises.push(
          openai.files.delete(uploadedFile.id).catch((err: any) => 
            console.error('Failed to delete file:', err)
          )
        );
      }
      
      if (assistant) {
        cleanupPromises.push(
          openai.beta.assistants.delete(assistant.id).catch((err: any) => 
            console.error('Failed to delete assistant:', err)
          )
        );
      }
      
      if (cleanupPromises.length > 0) {
        await Promise.allSettled(cleanupPromises);
      }
    }
    
  } catch (error: any) {
    console.error('Request processing error:', error);
    return createErrorResponse(
      error.message || 'Failed to process request',
      500,
      error.stack
    );
  }
}
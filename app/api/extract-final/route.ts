import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { extractTextSimple } from '@/lib/pdf-simple';
import { extractPDFTextEdge } from '@/lib/pdf-parser-edge';

const SYSTEM_PROMPT = `You are a data extraction specialist. Extract information from the provided text and return it in the exact JSON format requested. If a field cannot be found, use an empty string for text fields or 0 for numeric fields.`;

const EXTRACTION_PROMPT = `Extract purchase order or proposal information from this document. Look for customer details, job specifications, pricing, and line items. Return ONLY valid JSON in this exact format:

{
  "customer": {
    "companyName": "[extract company/facility name or empty string]",
    "contactName": "[extract contact person or empty string]",
    "email": "[extract email or empty string]",
    "phone": "[extract phone or empty string]",
    "jobLocation": "[extract address/location or empty string]",
    "onsiteContactName": "[extract onsite contact or empty string]",
    "onsiteContactPhone": "[extract onsite phone or empty string]"
  },
  "contractor": {
    "companyName": "TCS Floors",
    "technicianName": "[extract technician or use 'TBD']",
    "email": "[extract contractor email or use 'info@tcsfloors.com']",
    "phone": "[extract contractor phone or use '941-223-7294']"
  },
  "job": {
    "poNumber": "PO-[generate 6 random digits]",
    "requestedServiceDate": "[extract date in YYYY-MM-DD or use today + 7 days]",
    "squareFootage": [extract square footage as number or 0],
    "floorType": "[extract floor type or empty string]",
    "description": "[extract service description or empty string]",
    "additionalNotes": "[extract any notes or empty string]"
  },
  "lineItems": [
    {
      "description": "[extract item/service description]",
      "quantity": [extract quantity as number],
      "unit": "[extract unit type like 'sq ft', 'each', etc]",
      "unitPrice": [extract unit price as number],
      "total": [extract or calculate total as number]
    }
  ]
}

Extract all relevant information from this document text:`;

export async function POST(request: NextRequest) {
  // Generic PDF extraction - works with any customer PDF
  console.log('[extract-final] Starting extraction...');
  console.log('[extract-final] Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, errors: ['No file provided'] },
        { status: 400 }
      );
    }
    
    console.log('[extract-final] Processing:', file.name, 'Size:', file.size);
    
    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Try multiple extraction methods
    let extractedText = '';
    
    // Method 1: Try our edge-compatible parser
    try {
      extractedText = await extractPDFTextEdge(buffer);
      console.log('[extract-final] Edge extraction length:', extractedText.length);
    } catch (e) {
      console.log('[extract-final] Edge extraction failed:', e);
    }
    
    // Method 2: Fallback to simple extraction
    if (!extractedText || extractedText.length < 100) {
      extractedText = await extractTextSimple(buffer);
      console.log('[extract-final] Simple extraction length:', extractedText.length);
    }
    
    console.log('[extract-final] Final extracted text length:', extractedText.length);
    console.log('[extract-final] First 500 chars:', extractedText.substring(0, 500));
    
    // Debug: Check if we found any meaningful text
    const hasCompanyInfo = extractedText.toLowerCase().includes('convalescent') || 
                          extractedText.toLowerCase().includes('hospital') ||
                          extractedText.toLowerCase().includes('ararat');
    console.log('[extract-final] Has company info in text:', hasCompanyInfo);
    
    // Default data structure
    let extractedData = {
      customer: {
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        jobLocation: "",
        onsiteContactName: "",
        onsiteContactPhone: ""
      },
      contractor: {
        companyName: "TCS Floors",
        technicianName: "Jennifer Suzanne",
        email: "jennifer@tcsfloors.com",
        phone: "941-223-7294"
      },
      job: {
        poNumber: `PO-${Math.floor(100000 + Math.random() * 900000)}`,
        requestedServiceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        squareFootage: 0,
        floorType: "",
        description: "",
        additionalNotes: ""
      },
      lineItems: []
    };
    
    // Try Claude extraction if we have text
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (apiKey && extractedText.length > 50) {
      try {
        console.log('[extract-final] Calling Claude API...');
        const anthropic = new Anthropic({ apiKey });
        
        const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `${EXTRACTION_PROMPT}\n\n${extractedText.substring(0, 5000)}`
          }]
        });
        
        const content = message.content[0];
        if (content.type === 'text') {
          console.log('[extract-final] Claude response:', content.text.substring(0, 500));
          // Extract JSON from response
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('[extract-final] Parsed data from Claude:', parsed);
            extractedData = { ...extractedData, ...parsed };
            console.log('[extract-final] Claude extraction successful');
          } else {
            console.log('[extract-final] No JSON found in Claude response');
          }
        }
      } catch (error) {
        console.error('[extract-final] Claude error:', error);
      }
    }
    
    // Log extraction summary
    console.log('[extract-final] Extraction complete:', {
      hasCustomerData: !!extractedData.customer.companyName,
      hasJobData: !!extractedData.job.description,
      lineItemCount: extractedData.lineItems.length
    });
    
    return NextResponse.json({
      success: true,
      documentType: 'proposal',
      extractedData,
      errors: []
    });
    
  } catch (error) {
    console.error('[extract-final] Error:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to process PDF'] },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { success: false, errors: ['No text provided'] },
        { status: 400 }
      );
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, errors: ['OpenAI API key not configured'] },
        { status: 500 }
      );
    }
    
    console.log(`[structure-text] Processing ${text.length} characters of text`);
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      // Structure the extracted text into our format
      const structureResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a document analysis expert. Extract information accurately and return valid JSON only.'
          },
          {
            role: 'user',
            content: `Analyze this business document text and extract information for a purchase order.

Extract the following information:

1. CUSTOMER INFORMATION:
   - Company/Organization name (the entity receiving the service)
   - Primary contact person's name
   - Email address
   - Phone number
   - Full job location/address where work will be performed
   - Onsite contact name (if different from primary)
   - Onsite contact phone (if different from primary)

2. JOB DETAILS:
   - Square footage (look for "sq ft", "square feet", "SF", or similar)
   - Type of flooring (VCT, LVT, carpet, tile, concrete, etc.)
   - Detailed description of the work/service to be performed
   - Requested service date or timeline
   - Any special notes or requirements

3. PRICING/LINE ITEMS:
   - Look for itemized services or products
   - Quantities and units (sq ft, hours, etc.)
   - Unit prices
   - Total amounts

Return JSON in this EXACT format:
{
  "customer": {
    "companyName": "extracted company name",
    "contactName": "extracted contact name",
    "email": "extracted email",
    "phone": "extracted phone",
    "jobLocation": "full address where work will be performed",
    "onsiteContactName": "onsite contact or same as contactName",
    "onsiteContactPhone": "onsite phone or same as phone"
  },
  "job": {
    "squareFootage": numeric_value_or_0,
    "floorType": "type of flooring",
    "description": "detailed description of work",
    "requestedServiceDate": "YYYY-MM-DD format or empty string",
    "additionalNotes": "any special requirements or notes"
  },
  "lineItems": [
    {
      "description": "service or product description",
      "quantity": numeric_value,
      "unit": "unit of measure",
      "unitPrice": numeric_value,
      "total": numeric_value
    }
  ]
}

DOCUMENT TEXT:
${text}`
          }
        ],
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      
      const structuredData = structureResponse.choices[0]?.message?.content;
      
      if (!structuredData) {
        throw new Error('Failed to structure extracted data');
      }
      
      const parsedData = JSON.parse(structuredData);
      console.log('[structure-text] Successfully structured data');
      
      // Return with additional contractor info and PO number
      return NextResponse.json({
        success: true,
        documentType: 'proposal',
        extractedData: {
          ...parsedData,
          contractor: {
            companyName: 'TCS Floors',
            technicianName: 'TBD',
            email: 'info@tcsfloors.com',
            phone: '941-223-7294'
          },
          job: {
            ...parsedData.job,
            poNumber: `PO-${Math.floor(100000 + Math.random() * 900000)}`
          }
        },
        errors: []
      });
      
    } catch (error: any) {
      console.error('[structure-text] OpenAI error:', error);
      throw error;
    }
    
  } catch (error: any) {
    console.error('[structure-text] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        errors: [error.message || 'Failed to structure text'] 
      },
      { status: 500 }
    );
  }
}
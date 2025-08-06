import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, errors: ['No file provided'] },
        { status: 400 }
      );
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, errors: ['OpenAI API key not configured'] },
        { status: 500 }
      );
    }
    
    console.log(`[extract-vision] Processing ${file.name} (${file.size} bytes)`);
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      // Step 1: Convert PDF to base64 for Vision API
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;
      
      console.log('[extract-vision] Step 1: Sending PDF to OpenAI Vision for text extraction...');
      
      // First call: Extract all text from the PDF using Vision
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL text from this PDF document. Include every piece of text you can see, maintaining the structure and layout as much as possible. Return the complete text content.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0
      });
      
      const extractedText = visionResponse.choices[0]?.message?.content;
      
      if (!extractedText) {
        throw new Error('No text extracted from PDF');
      }
      
      console.log(`[extract-vision] Extracted ${extractedText.length} characters from PDF`);
      console.log('[extract-vision] Step 2: Structuring extracted text...');
      
      // Second call: Structure the extracted text into our format
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
${extractedText}`
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
      console.log('[extract-vision] Successfully structured data');
      
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
      console.error('[extract-vision] OpenAI error:', error);
      
      if (error.message?.includes('image_url')) {
        return NextResponse.json({
          success: false,
          errors: ['PDF processing failed. OpenAI Vision may not support this PDF format. Try converting to images first.']
        }, { status: 400 });
      }
      
      throw error;
    }
    
  } catch (error: any) {
    console.error('[extract-vision] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        errors: [error.message || 'Failed to process PDF with OpenAI Vision'] 
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { extractPDFTextEdge } from '@/lib/pdf-parser-edge';

const EXTRACTION_PROMPT = `Extract purchase order or proposal information from this document. Return ONLY valid JSON with this structure:

{
  "customer": {
    "companyName": "company/facility name",
    "contactName": "contact person",
    "email": "email address",
    "phone": "phone number",
    "jobLocation": "full address",
    "onsiteContactName": "onsite contact",
    "onsiteContactPhone": "onsite phone"
  },
  "contractor": {
    "companyName": "TCS Floors",
    "technicianName": "technician name or TBD",
    "email": "contractor email",
    "phone": "contractor phone"
  },
  "job": {
    "poNumber": "PO-XXXXXX",
    "requestedServiceDate": "YYYY-MM-DD",
    "squareFootage": 0,
    "floorType": "floor type",
    "description": "service description",
    "additionalNotes": "notes"
  },
  "lineItems": [
    {
      "description": "item description",
      "quantity": 0,
      "unit": "unit",
      "unitPrice": 0,
      "total": 0
    }
  ]
}`;

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
    
    // Convert to buffer and extract text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let extractedText = '';
    try {
      extractedText = await extractPDFTextEdge(buffer);
    } catch (e) {
      // Basic fallback
      const content = buffer.toString('latin1');
      const readable = content.match(/[a-zA-Z0-9\s\.,;:!?@#$%&*()_+=\-'"\[\]{}|\/\\]{20,}/g);
      if (readable) {
        extractedText = readable.join(' ');
      }
    }
    
    // Default response
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
        technicianName: "TBD",
        email: "info@tcsfloors.com",
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
    
    // Try OpenAI if we have an API key and text
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (apiKey && extractedText.length > 50) {
      try {
        const openai = new OpenAI({ apiKey });
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a data extraction specialist. Extract information from documents and return only valid JSON.'
            },
            {
              role: 'user',
              content: `${EXTRACTION_PROMPT}\n\nDocument text:\n${extractedText.substring(0, 4000)}`
            }
          ],
          temperature: 0,
          max_tokens: 1000,
          response_format: { type: 'json_object' }
        });
        
        const responseText = completion.choices[0]?.message?.content;
        if (responseText) {
          try {
            const parsed = JSON.parse(responseText);
            extractedData = { ...extractedData, ...parsed };
          } catch (e) {
            console.error('[extract-openai] JSON parse error:', e);
          }
        }
      } catch (error) {
        console.error('[extract-openai] OpenAI error:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      documentType: 'proposal',
      extractedData,
      errors: []
    });
    
  } catch (error) {
    console.error('[extract-openai] Error:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to process PDF'] },
      { status: 500 }
    );
  }
}
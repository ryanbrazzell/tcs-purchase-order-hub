import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import PDFParser from 'pdf2json';

const DETAILED_EXTRACTION_PROMPT = `You are analyzing a business document (likely a proposal or quote) to extract information for a purchase order.

Please carefully read through the ENTIRE document and extract:

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
   - Look for subtotals, taxes, grand totals

Return the extracted information as JSON in this EXACT format:
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

IMPORTANT: 
- Extract ACTUAL information from the document
- If a field is not found, use empty string for text or 0 for numbers
- For line items, include ALL services/products listed with their prices
- Be thorough - read the entire document to find all relevant information`;

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
    
    console.log(`[extract-complete] Processing ${file.name} (${file.size} bytes)`);
    
    // Step 1: Extract ALL text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const fullText = await extractFullPDFText(buffer);
    console.log(`[extract-complete] Extracted ${fullText.length} characters from PDF`);
    
    if (fullText.length < 50) {
      return NextResponse.json({
        success: false,
        errors: ['Could not extract text from PDF. The file may be corrupted or image-based.']
      }, { status: 400 });
    }
    
    // Step 2: Send complete text to AI for intelligent extraction
    const extractedData = await extractWithAI(fullText);
    
    // Step 3: Return structured data with generated PO number
    return NextResponse.json({
      success: true,
      documentType: 'proposal',
      extractedData: {
        ...extractedData,
        contractor: {
          companyName: 'TCS Floors',
          technicianName: 'TBD',
          email: 'info@tcsfloors.com',
          phone: '941-223-7294'
        },
        job: {
          ...extractedData.job,
          poNumber: `PO-${Math.floor(100000 + Math.random() * 900000)}`
        }
      },
      errors: []
    });
    
  } catch (error) {
    console.error('[extract-complete] Error:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to process PDF'] },
      { status: 500 }
    );
  }
}

async function extractFullPDFText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    const pdfParser = new (PDFParser as any)(null, 1);
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(errData.parserError);
    });
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        let fullText = '';
        
        // Extract text from every page
        if (pdfData && pdfData.Pages) {
          pdfData.Pages.forEach((page: any, pageIndex: number) => {
            fullText += `\n\n--- Page ${pageIndex + 1} ---\n\n`;
            
            if (page.Texts) {
              let lineY = -1;
              let line = '';
              
              // Sort texts by Y position then X position for better reading order
              const sortedTexts = page.Texts.sort((a: any, b: any) => {
                if (Math.abs(a.y - b.y) < 0.1) {
                  return a.x - b.x;
                }
                return a.y - b.y;
              });
              
              sortedTexts.forEach((textItem: any) => {
                // Check if we're on a new line
                if (lineY !== -1 && Math.abs(textItem.y - lineY) > 0.1) {
                  fullText += line + '\n';
                  line = '';
                }
                lineY = textItem.y;
                
                // Extract text from this item
                if (textItem.R) {
                  textItem.R.forEach((r: any) => {
                    if (r.T) {
                      line += decodeURIComponent(r.T) + ' ';
                    }
                  });
                }
              });
              
              // Add the last line
              if (line) {
                fullText += line + '\n';
              }
            }
          });
        }
        
        resolve(fullText.trim());
      } catch (err) {
        console.error('[extract-complete] Text extraction error:', err);
        resolve('');
      }
    });
    
    pdfParser.parseBuffer(buffer);
  });
}

async function extractWithAI(text: string): Promise<any> {
  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = require('openai').default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      console.log('[extract-complete] Sending to OpenAI for extraction...');
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a document analysis expert. Extract information accurately and return valid JSON only.'
          },
          {
            role: 'user',
            content: `${DETAILED_EXTRACTION_PROMPT}\n\nDOCUMENT TEXT:\n${text}`
          }
        ],
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      
      const response = completion.choices[0]?.message?.content;
      if (response) {
        const parsed = JSON.parse(response);
        console.log('[extract-complete] OpenAI extraction successful');
        return parsed;
      }
    } catch (error: any) {
      console.error('[extract-complete] OpenAI error:', error.message);
    }
  }
  
  // Try Claude as fallback
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      console.log('[extract-complete] Sending to Claude for extraction...');
      
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0,
        messages: [{
          role: 'user',
          content: `${DETAILED_EXTRACTION_PROMPT}\n\nDOCUMENT TEXT:\n${text}`
        }]
      });
      
      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('[extract-complete] Claude extraction successful');
          return parsed;
        }
      }
    } catch (error: any) {
      console.error('[extract-complete] Claude error:', error.message);
    }
  }
  
  // If no AI is available, return empty structure
  console.log('[extract-complete] No AI available, returning empty structure');
  return {
    customer: {
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      jobLocation: '',
      onsiteContactName: '',
      onsiteContactPhone: ''
    },
    job: {
      squareFootage: 0,
      floorType: '',
      description: '',
      requestedServiceDate: '',
      additionalNotes: ''
    },
    lineItems: []
  };
}
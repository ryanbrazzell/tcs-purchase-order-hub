import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore - pdf2json doesn't have proper types
import PDFParser from 'pdf2json';

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
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text using pdf2json
    const extractedText = await new Promise<string>((resolve, reject) => {
      // @ts-ignore - Type casting as recommended by the library docs
      const pdfParser = new (PDFParser as any)(null, 1);
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(errData.parserError);
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract all text from the PDF
          let text = '';
          
          if (pdfData && pdfData.Pages) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts) {
                page.Texts.forEach((textItem: any) => {
                  if (textItem.R) {
                    textItem.R.forEach((r: any) => {
                      if (r.T) {
                        // Decode URI component to get readable text
                        text += decodeURIComponent(r.T) + ' ';
                      }
                    });
                  }
                });
                text += '\n';
              }
            });
          }
          
          resolve(text.trim());
        } catch (err) {
          resolve('');
        }
      });
      
      // Parse the PDF buffer
      pdfParser.parseBuffer(buffer);
    });
    
    
    // Now send the text to AI for structured extraction
    const extractedData = await extractWithAI(extractedText);
    
    return NextResponse.json({
      success: true,
      documentType: 'proposal',
      extractedData,
      errors: []
    });
    
  } catch (error) {
    console.error('[extract-simple-pdf] Error:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to process PDF'] },
      { status: 500 }
    );
  }
}

async function extractWithAI(text: string): Promise<any> {
  // Default structure
  const defaultData = {
    customer: {
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      jobLocation: '',
      onsiteContactName: '',
      onsiteContactPhone: ''
    },
    contractor: {
      companyName: 'TCS Floors',
      technicianName: 'TBD',
      email: 'info@tcsfloors.com',
      phone: '941-223-7294'
    },
    job: {
      poNumber: `PO-${Math.floor(100000 + Math.random() * 900000)}`,
      requestedServiceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      squareFootage: 0,
      floorType: '',
      description: '',
      additionalNotes: ''
    },
    lineItems: []
  };
  
  if (!text || text.length < 50) {
    return defaultData;
  }
  
  // Try OpenAI first if available
  if (process.env.OPENAI_API_KEY) {
    try {
      const OpenAI = require('openai').default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: `Extract purchase order data from this text and return ONLY valid JSON:
{
  "customer": { "companyName", "contactName", "email", "phone", "jobLocation" },
  "job": { "squareFootage", "floorType", "description" },
  "lineItems": [{ "description", "quantity", "unit", "unitPrice", "total" }]
}

Text: ${text.substring(0, 3000)}`
        }],
        temperature: 0,
        max_tokens: 800
      });
      
      const response = completion.choices[0]?.message?.content;
      if (response) {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return { ...defaultData, ...parsed };
        }
      }
    } catch (e) {
      // OpenAI failed, continue to pattern matching
    }
  }
  
  // Fallback to pattern matching
  const patterns = {
    companyName: /(hospital|clinic|medical|center|facility|company|corporation|inc|llc|ltd)\s*:?\s*([A-Za-z0-9\s&,.-]+)/i,
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    phone: /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/,
    squareFootage: /(\d{1,5})\s*(?:sq|square)\s*(?:ft|feet|foot)/i,
    floorType: /(vct|lvt|vinyl|carpet|tile|hardwood|laminate|concrete|terrazzo)/i,
    price: /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
  };
  
  // Extract using patterns
  const companyMatch = text.match(patterns.companyName);
  if (companyMatch) {
    defaultData.customer.companyName = companyMatch[2].trim();
  }
  
  const emailMatch = text.match(patterns.email);
  if (emailMatch) {
    defaultData.customer.email = emailMatch[1];
  }
  
  const phoneMatch = text.match(patterns.phone);
  if (phoneMatch) {
    defaultData.customer.phone = phoneMatch[1];
  }
  
  const sqftMatch = text.match(patterns.squareFootage);
  if (sqftMatch) {
    defaultData.job.squareFootage = parseInt(sqftMatch[1]);
  }
  
  const floorMatch = text.match(patterns.floorType);
  if (floorMatch) {
    defaultData.job.floorType = floorMatch[1].toUpperCase();
  }
  
  const priceMatch = text.match(patterns.price);
  if (priceMatch) {
    const total = parseFloat(priceMatch[1].replace(/,/g, ''));
    defaultData.lineItems = [{
      description: 'Floor Service',
      quantity: defaultData.job.squareFootage || 1,
      unit: defaultData.job.squareFootage ? 'sq ft' : 'job',
      unitPrice: defaultData.job.squareFootage ? total / defaultData.job.squareFootage : total,
      total: total
    }];
  }
  
  return defaultData;
}
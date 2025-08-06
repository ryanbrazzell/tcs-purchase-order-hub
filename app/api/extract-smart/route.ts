import { NextRequest, NextResponse } from 'next/server';
import { extractPDFTextEdge } from '@/lib/pdf-parser-edge';

// Import AI providers conditionally
let Anthropic: any;
let OpenAI: any;

try {
  Anthropic = require('@anthropic-ai/sdk').default;
} catch (e) {}

try {
  OpenAI = require('openai').default;
} catch (e) {}

const EXTRACTION_SCHEMA = {
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
    poNumber: '',
    requestedServiceDate: '',
    squareFootage: 0,
    floorType: '',
    description: '',
    additionalNotes: ''
  },
  lineItems: []
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, errors: ['No file provided'] },
        { status: 400 }
      );
    }
    
    // Extract text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let extractedText = '';
    try {
      extractedText = await extractPDFTextEdge(buffer);
    } catch (e) {
      const content = buffer.toString('latin1');
      const readable = content.match(/[a-zA-Z0-9\s\.,;:!?@#$%&*()_+=\-'"\[\]{}|\/\\]{20,}/g);
      if (readable) {
        extractedText = readable.join(' ').substring(0, 10000);
      }
    }
    
    // Initialize with defaults
    let extractedData = JSON.parse(JSON.stringify(EXTRACTION_SCHEMA));
    extractedData.job.poNumber = `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    extractedData.job.requestedServiceDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (extractedText.length < 50) {
      // Not enough text to process
      return NextResponse.json({
        success: true,
        documentType: 'proposal',
        extractedData,
        errors: ['Could not extract readable text from PDF']
      });
    }
    
    // Try AI extraction with timeout
    const extractionPromise = extractWithAI(extractedText);
    const timeoutPromise = new Promise(resolve => 
      setTimeout(() => resolve(null), 10000) // 10 second timeout
    );
    
    const aiResult = await Promise.race([extractionPromise, timeoutPromise]);
    
    if (aiResult) {
      extractedData = { ...extractedData, ...aiResult };
    } else {
      // Fallback to pattern matching
      extractedData = extractWithPatterns(extractedText, extractedData);
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`[extract-smart] Completed in ${elapsed}ms`);
    
    return NextResponse.json({
      success: true,
      documentType: 'proposal',
      extractedData,
      errors: []
    });
    
  } catch (error) {
    console.error('[extract-smart] Error:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to process PDF'] },
      { status: 500 }
    );
  }
}

async function extractWithAI(text: string): Promise<any> {
  const prompt = `Extract purchase order information. Return JSON only:
{
  "customer": { "companyName", "contactName", "email", "phone", "jobLocation", "onsiteContactName", "onsiteContactPhone" },
  "job": { "squareFootage", "floorType", "description" },
  "lineItems": [{ "description", "quantity", "unit", "unitPrice", "total" }]
}

Text: ${text.substring(0, 3000)}`;

  // Try OpenAI first (usually faster)
  if (OpenAI && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 800
      });
      
      const content = completion.choices[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      console.log('[extract-smart] OpenAI failed:', e);
    }
  }
  
  // Try Claude as fallback
  if (Anthropic && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (e) {
      console.log('[extract-smart] Claude failed:', e);
    }
  }
  
  return null;
}

function extractWithPatterns(text: string, data: any): any {
  // Extract company name
  const companyMatch = text.match(/(hospital|clinic|medical|center|facility|company|corporation|inc|llc|ltd)\s*:?\s*([A-Za-z0-9\s&,.-]+)/i);
  if (companyMatch) {
    data.customer.companyName = companyMatch[2].trim();
  }
  
  // Extract email
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    data.customer.email = emailMatch[1];
  }
  
  // Extract phone
  const phoneMatch = text.match(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
  if (phoneMatch) {
    data.customer.phone = phoneMatch[1];
  }
  
  // Extract square footage
  const sqftMatch = text.match(/(\d{1,5})\s*(?:sq|square)\s*(?:ft|feet|foot)/i);
  if (sqftMatch) {
    data.job.squareFootage = parseInt(sqftMatch[1]);
  }
  
  // Extract floor type
  const floorMatch = text.match(/(vct|lvt|vinyl|carpet|tile|hardwood|laminate|concrete|terrazzo)/i);
  if (floorMatch) {
    data.job.floorType = floorMatch[1].toUpperCase();
  }
  
  // Extract price
  const priceMatch = text.match(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
  if (priceMatch) {
    const total = parseFloat(priceMatch[1].replace(/,/g, ''));
    data.lineItems = [{
      description: data.job.description || 'Floor Service',
      quantity: data.job.squareFootage || 1,
      unit: data.job.squareFootage ? 'sq ft' : 'job',
      unitPrice: data.job.squareFootage ? total / data.job.squareFootage : total,
      total: total
    }];
  }
  
  return data;
}
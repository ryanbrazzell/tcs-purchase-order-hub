import { NextRequest, NextResponse } from 'next/server';
import { extractPDFTextEdge } from '@/lib/pdf-parser-edge';

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
    
    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract text quickly
    let extractedText = '';
    try {
      extractedText = await extractPDFTextEdge(buffer);
    } catch (e) {
      // Fallback to basic extraction
      const content = buffer.toString('latin1');
      const readable = content.match(/[a-zA-Z0-9\s\.,;:!?@#$%&*()_+=\-'"\[\]{}|\/\\]{20,}/g);
      if (readable) {
        extractedText = readable.join(' ');
      }
    }
    
    // Parse text for common patterns
    const extractedData = {
      customer: {
        companyName: extractPattern(extractedText, /(hospital|clinic|center|facility|company|corporation|inc|llc|ltd)[\s:]+([A-Za-z0-9\s&,.-]+)/i, 2) || '',
        contactName: extractPattern(extractedText, /(contact|name|attn|attention)[\s:]+([A-Za-z\s]+)/i, 2) || '',
        email: extractPattern(extractedText, /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i, 1) || '',
        phone: extractPattern(extractedText, /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i, 1) || '',
        jobLocation: extractPattern(extractedText, /(\d+[\s\w,.-]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)[\s\w,.-]*\d{5})/i, 1) || '',
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
        squareFootage: parseInt(extractPattern(extractedText, /(\d{1,5})\s*(?:sq|square)\s*(?:ft|feet|foot)/i, 1) || '0'),
        floorType: extractPattern(extractedText, /(vct|lvt|vinyl|carpet|tile|hardwood|laminate|concrete)/i, 1) || '',
        description: extractPattern(extractedText, /(service|work|job|project)[\s:]+([^.\n]{10,100})/i, 2) || '',
        additionalNotes: ''
      },
      lineItems: []
    };
    
    // Try to extract pricing
    const priceMatch = extractedText.match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g);
    if (priceMatch && priceMatch.length > 0) {
      const total = parseFloat(priceMatch[0].replace(/[$,]/g, ''));
      extractedData.lineItems.push({
        description: extractedData.job.description || 'Floor Service',
        quantity: extractedData.job.squareFootage || 1,
        unit: extractedData.job.squareFootage ? 'sq ft' : 'job',
        unitPrice: extractedData.job.squareFootage ? total / extractedData.job.squareFootage : total,
        total: total
      });
    }
    
    return NextResponse.json({
      success: true,
      documentType: 'proposal',
      extractedData,
      errors: []
    });
    
  } catch (error) {
    console.error('[extract-fast] Error:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to process PDF'] },
      { status: 500 }
    );
  }
}

function extractPattern(text: string, pattern: RegExp, group: number = 0): string | null {
  const match = text.match(pattern);
  return match && match[group] ? match[group].trim() : null;
}
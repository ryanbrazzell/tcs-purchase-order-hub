import { NextRequest, NextResponse } from 'next/server';
import { ExtractPDFResponse } from '@/types';
import { extractTextSimple } from '@/lib/pdf-simple';
import Anthropic from '@anthropic-ai/sdk';

// Simple Claude-based PDF extraction
export async function POST(request: NextRequest) {
  console.log('[extract-claude] Starting PDF extraction with Claude...');
  
  try {
    // Get the PDF file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, errors: ['No file provided'] },
        { status: 400 }
      );
    }
    
    console.log('[extract-claude] Processing file:', file.name);
    
    // Extract text from PDF using our simple method
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Try simple text extraction
    let pdfText = await extractTextSimple(buffer);
    
    // If simple extraction didn't work well, try a basic text dump
    if (!pdfText || pdfText.length < 100) {
      // Just get any readable text from the PDF
      const binaryString = buffer.toString('binary');
      const readableChunks = binaryString.match(/[\x20-\x7E]{20,}/g) || [];
      pdfText = readableChunks.join(' ');
    }
    
    console.log('[extract-claude] Extracted text length:', pdfText.length);
    
    if (!pdfText || pdfText.length < 50) {
      return NextResponse.json(
        { success: false, errors: ['Could not extract text from PDF'] },
        { status: 400 }
      );
    }
    
    // Initialize Claude
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    
    const anthropic = new Anthropic({ apiKey });
    
    // Send extracted text to Claude
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `Extract information from this PDF text and return it as JSON. Look for:
            
1. Customer information (company name, contact, email, phone, address)
2. Job details (service date, square footage, floor type, description)
3. Line items with quantities and prices
4. Any contractor/service provider information

Return the data in this exact JSON format:
{
  "documentType": "proposal" or "purchase_order",
  "customer": {
    "companyName": "",
    "contactName": "",
    "email": "",
    "phone": "",
    "jobLocation": "",
    "onsiteContactName": "",
    "onsiteContactPhone": ""
  },
  "contractor": {
    "companyName": "",
    "technicianName": "",
    "email": "",
    "phone": ""
  },
  "job": {
    "poNumber": "",
    "requestedServiceDate": "",
    "squareFootage": 0,
    "floorType": "",
    "description": "",
    "additionalNotes": ""
  },
  "lineItems": [
    {
      "description": "",
      "quantity": 0,
      "unit": "",
      "unitPrice": 0,
      "total": 0
    }
  ]
}

PDF Text to analyze:
${pdfText}

Important: Return ONLY the JSON, no other text.`
      }]
    });
    
    // Parse Claude's response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }
    
    // Extract JSON from the response
    let extractedData;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[extract-claude] Failed to parse JSON:', content.text);
      throw new Error('Failed to parse extraction results');
    }
    
    // Return the response
    const apiResponse: ExtractPDFResponse = {
      success: true,
      documentType: extractedData.documentType || 'proposal',
      extractedData: extractedData,
      errors: []
    };
    
    console.log('[extract-claude] Extraction successful');
    return NextResponse.json(apiResponse);
    
  } catch (error) {
    console.error('[extract-claude] Error:', error);
    
    let errorMessage = 'Failed to extract PDF';
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'API configuration error';
      } else if (error.message.includes('parse')) {
        errorMessage = 'Failed to process extracted data';
      }
    }
    
    return NextResponse.json(
      { success: false, errors: [errorMessage] },
      { status: 500 }
    );
  }
}
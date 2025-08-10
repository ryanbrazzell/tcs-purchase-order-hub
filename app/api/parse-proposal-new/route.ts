import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const data = await pdfParse(buffer);
    const text = data.text || '';
    
    if (!text.trim()) {
      return NextResponse.json({ error: 'No text found in PDF' }, { status: 400 });
    }
    
    // Send to OpenAI
    const prompt = `Extract information from this floor service proposal and return JSON with these fields:
    customer_company, square_footage, service_type, subtotal, tax, total, customer_phone, customer_email, project_address

    Text: ${text.substring(0, 3000)}`;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Extract data and return valid JSON only' },
        { role: 'user', content: prompt }
      ],
      temperature: 0,
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Add default fields
    result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    result.po_date = result.po_date || new Date().toISOString().split('T')[0];
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process PDF',
      details: error.stack
    }, { status: 500 });
  }
}
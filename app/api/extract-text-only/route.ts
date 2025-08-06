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
    
    console.log(`[extract-text-only] Processing ${file.name} (${file.size} bytes)`);
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      // Convert PDF to base64 for Vision API
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:application/pdf;base64,${base64}`;
      
      console.log('[extract-text-only] Sending PDF to OpenAI Vision for text extraction...');
      
      // Extract all text from the PDF using Vision
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract ALL text from this PDF document. Include every piece of text you can see, maintaining the structure and layout as much as possible. Include headers, body text, tables, everything. Return the complete text content exactly as it appears.'
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
      
      const extractedText = visionResponse.choices[0]?.message?.content || '';
      
      console.log(`[extract-text-only] Extracted ${extractedText.length} characters from PDF`);
      
      return NextResponse.json({
        success: true,
        extractedText: extractedText,
        characterCount: extractedText.length,
        errors: []
      });
      
    } catch (error: any) {
      console.error('[extract-text-only] OpenAI error:', error);
      
      if (error.message?.includes('image_url')) {
        return NextResponse.json({
          success: false,
          errors: ['PDF processing failed. OpenAI Vision may not support this PDF format directly.']
        }, { status: 400 });
      }
      
      throw error;
    }
    
  } catch (error: any) {
    console.error('[extract-text-only] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        errors: [error.message || 'Failed to extract text from PDF'] 
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { images } = data;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, errors: ['No images provided'] },
        { status: 400 }
      );
    }
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, errors: ['OpenAI API key not configured'] },
        { status: 500 }
      );
    }
    
    console.log(`[extract-text-only] Processing ${images.length} images`);
    
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    try {
      console.log('[extract-text-only] Sending images to OpenAI Vision...');
      
      // Build message content with all images
      const messageContent: any[] = [
        {
          type: 'text',
          text: 'Extract ALL text from these document pages. Include every piece of text you can see, maintaining the structure and layout as much as possible. Include headers, body text, tables, everything. Return the complete text content exactly as it appears. Preserve the exact formatting and spacing.'
        }
      ];
      
      // Add each image
      images.forEach((imageDataUrl: string, index: number) => {
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: imageDataUrl,
            detail: 'high'
          }
        });
      });
      
      // Extract text using Vision
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        max_tokens: 4000,
        temperature: 0
      });
      
      const extractedText = visionResponse.choices[0]?.message?.content || '';
      
      console.log(`[extract-text-only] Extracted ${extractedText.length} characters`);
      
      return NextResponse.json({
        success: true,
        extractedText: extractedText,
        characterCount: extractedText.length,
        pageCount: images.length,
        errors: []
      });
      
    } catch (error: any) {
      console.error('[extract-text-only] OpenAI error:', error);
      throw error;
    }
    
  } catch (error: any) {
    console.error('[extract-text-only] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        errors: [error.message || 'Failed to extract text'] 
      },
      { status: 500 }
    );
  }
}
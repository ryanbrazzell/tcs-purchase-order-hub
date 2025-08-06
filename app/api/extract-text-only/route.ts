import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { pdf } from 'pdf-to-img';

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
      // Convert PDF to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      console.log('[extract-text-only] Converting PDF to images...');
      
      // Convert PDF pages to images
      const document = await pdf(buffer, { scale: 2.0 });
      const imageUrls: string[] = [];
      
      for await (const image of document) {
        const base64 = image.toString('base64');
        imageUrls.push(`data:image/png;base64,${base64}`);
        console.log(`[extract-text-only] Converted page to image (${base64.length} chars)`);
      }
      
      console.log(`[extract-text-only] Converted ${imageUrls.length} pages to images`);
      console.log('[extract-text-only] Sending images to OpenAI Vision for text extraction...');
      
      // Build message content with all page images
      const messageContent: any[] = [
        {
          type: 'text',
          text: 'Extract ALL text from these document pages. Include every piece of text you can see, maintaining the structure and layout as much as possible. Include headers, body text, tables, everything. Return the complete text content exactly as it appears. Preserve the exact formatting and spacing.'
        }
      ];
      
      // Add each page image
      imageUrls.forEach((url, index) => {
        messageContent.push({
          type: 'image_url',
          image_url: {
            url: url,
            detail: 'high' // High detail for better text extraction
          }
        });
      });
      
      // Extract all text from the images using Vision
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
      
      console.log(`[extract-text-only] Extracted ${extractedText.length} characters from PDF`);
      
      return NextResponse.json({
        success: true,
        extractedText: extractedText,
        characterCount: extractedText.length,
        pageCount: imageUrls.length,
        errors: []
      });
      
    } catch (error: any) {
      console.error('[extract-text-only] Processing error:', error);
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
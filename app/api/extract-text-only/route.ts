import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

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
      console.log('[extract-text-only] Uploading PDF to OpenAI...');
      
      // Upload the PDF file to OpenAI
      const uploadedFile = await openai.files.create({
        file: await toFile(file),
        purpose: 'assistants'
      });
      
      console.log(`[extract-text-only] File uploaded with ID: ${uploadedFile.id}`);
      console.log('[extract-text-only] Sending to OpenAI Vision for text extraction...');
      
      // Use the file ID in the vision request
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
                  url: `file://${uploadedFile.id}`
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
      
      // Clean up - delete the uploaded file
      try {
        await openai.files.del(uploadedFile.id);
        console.log(`[extract-text-only] Cleaned up uploaded file ${uploadedFile.id}`);
      } catch (error) {
        console.error('[extract-text-only] Failed to delete uploaded file:', error);
      }
      
      return NextResponse.json({
        success: true,
        extractedText: extractedText,
        characterCount: extractedText.length,
        errors: []
      });
      
    } catch (error: any) {
      console.error('[extract-text-only] OpenAI error:', error);
      
      // Try alternative approach with base64
      if (error.message?.includes('file://') || error.message?.includes('Invalid')) {
        console.log('[extract-text-only] Trying base64 approach...');
        
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const dataUrl = `data:application/pdf;base64,${base64}`;
        
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
        
        return NextResponse.json({
          success: true,
          extractedText: extractedText,
          characterCount: extractedText.length,
          errors: []
        });
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
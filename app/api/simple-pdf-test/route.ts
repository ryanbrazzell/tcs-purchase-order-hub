import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    console.log(`[simple-pdf-test] Processing ${file.name}`);
    
    // Try multiple extraction methods
    const results: any = {
      fileName: file.name,
      fileSize: file.size,
      methods: {}
    };
    
    // Method 1: Try pdf-parse
    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      
      results.methods.pdfParse = {
        success: true,
        textLength: parsed.text.length,
        firstChars: parsed.text.substring(0, 500)
      };
      
      // If we got text, send to OpenAI
      if (parsed.text && parsed.text.length > 50 && openai) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are analyzing a business document. Provide a brief summary.'
            },
            {
              role: 'user',
              content: `Please summarize this document and identify what type of document it is:\n\n${parsed.text.substring(0, 8000)}`
            }
          ],
          temperature: 0
        });
        
        results.openAISummary = completion.choices[0].message.content;
      }
    } catch (e: any) {
      results.methods.pdfParse = {
        success: false,
        error: e.message
      };
    }
    
    // Method 2: Try converting to base64 and asking GPT-4V
    try {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mimeType = 'application/pdf';
      
      // Note: This will only work if OpenAI starts supporting PDFs in vision
      let visionResult: any;
      try {
        const visionResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'What type of document is this? Can you read any text from it?'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        });
        visionResult = { success: true, response: visionResponse.choices[0]?.message?.content };
      } catch (e: any) {
        visionResult = { success: false, error: e.message };
      }
      
      results.methods.vision = visionResult;
    } catch (e: any) {
      results.methods.vision = {
        success: false,
        error: e.message
      };
    }
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('[simple-pdf-test] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process PDF'
    }, { status: 500 });
  }
}
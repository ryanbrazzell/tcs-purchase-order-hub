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
      console.log('[extract-text-only] Using GPT-4 to extract text from PDF...');
      
      // Convert file to base64
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      
      // Create a simple prompt that asks GPT-4 to extract text
      // Note: We're using the regular chat completion, not vision
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a document text extractor. Extract all text from the provided document and return it maintaining the original structure and formatting.'
          },
          {
            role: 'user',
            content: `I have a PDF document that I need you to extract text from. The PDF contains a business proposal or quote. Please extract ALL text from the document, maintaining the structure and layout as much as possible. Include headers, body text, tables, contact information, pricing, everything.

Since I cannot directly send you the PDF through this API, I'll need to use a different approach. For now, please return a message explaining that PDF extraction requires the document to be converted to text first using a PDF parsing library on the server side.

Return the following JSON structure:
{
  "extractedText": "PDF extraction requires server-side processing. The document needs to be parsed using a PDF library to extract the text content before it can be processed.",
  "requiresProcessing": true
}`
          }
        ],
        temperature: 0,
        response_format: { type: 'json_object' }
      });
      
      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // If we get here, we need to use a different approach
      // Let's try using pdf2json which we know works
      console.log('[extract-text-only] Falling back to pdf2json...');
      
      // Import pdf2json dynamically
      const PDFParser = require('pdf2json');
      
      return new Promise((resolve) => {
        const pdfParser = new PDFParser(null, 1);
        
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          console.error('[extract-text-only] PDF parsing error:', errData);
          resolve(NextResponse.json({
            success: false,
            errors: ['Failed to parse PDF: ' + errData.parserError]
          }, { status: 500 }));
        });
        
        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          try {
            let fullText = '';
            
            // Extract text from every page
            if (pdfData && pdfData.Pages) {
              pdfData.Pages.forEach((page: any, pageIndex: number) => {
                fullText += `\n\n--- Page ${pageIndex + 1} ---\n\n`;
                
                if (page.Texts) {
                  let lineY = -1;
                  let line = '';
                  
                  // Sort texts by Y position then X position
                  const sortedTexts = page.Texts.sort((a: any, b: any) => {
                    if (Math.abs(a.y - b.y) < 0.1) {
                      return a.x - b.x;
                    }
                    return a.y - b.y;
                  });
                  
                  sortedTexts.forEach((textItem: any) => {
                    // Check if we're on a new line
                    if (lineY !== -1 && Math.abs(textItem.y - lineY) > 0.1) {
                      fullText += line + '\n';
                      line = '';
                    }
                    lineY = textItem.y;
                    
                    // Extract text from this item
                    if (textItem.R) {
                      textItem.R.forEach((r: any) => {
                        if (r.T) {
                          line += decodeURIComponent(r.T) + ' ';
                        }
                      });
                    }
                  });
                  
                  // Add the last line
                  if (line) {
                    fullText += line + '\n';
                  }
                }
              });
            }
            
            console.log(`[extract-text-only] Extracted ${fullText.length} characters using pdf2json`);
            
            resolve(NextResponse.json({
              success: true,
              extractedText: fullText.trim(),
              characterCount: fullText.length,
              pageCount: pdfData.Pages?.length || 0,
              errors: []
            }));
          } catch (err) {
            console.error('[extract-text-only] Text extraction error:', err);
            resolve(NextResponse.json({
              success: false,
              errors: ['Failed to extract text from PDF']
            }, { status: 500 }));
          }
        });
        
        pdfParser.parseBuffer(buffer);
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
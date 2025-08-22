import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Same field schema for consistency
const FIELD_SCHEMA = {
  po_date: '',
  po_number: '',
  customer_first_name: '',
  customer_last_name: '',
  customer_company: '',
  onsite_contact_name: '',
  onsite_contact_phone: '',
  customer_phone: '',
  project_address: '',
  city: '',
  state: '',
  zip: '',
  service_type: '',
  service_description: '',
  floor_type: '',
  square_footage: '',
  timeline: '',
  requested_service_date: '',
  special_requirements: '',
  doc_reference: '',
  notes: '',
  subcontractor_company: '',
  subcontractor_contact: '',
  subcontractor_phone: '',
  subcontractor_email: '',
  subcontractor_address: '',
  subcontractor_city: '',
  subcontractor_state: '',
  subcontractor_zip: '',
  line_item_1_desc: '',
  line_item_1_price: '',
  line_item_2_desc: '',
  line_item_2_price: '',
  line_item_3_desc: '',
  line_item_3_price: '',
  line_item_4_desc: '',
  line_item_4_price: '',
  line_item_5_desc: '',
  line_item_5_price: '',
  total: ''
};

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    console.log(`[${requestId}] Starting combined extraction request`);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const voiceFile = formData.get('voice') as File | null;
    
    // Validate inputs
    if (!file) {
      console.error(`[${requestId}] No PDF file uploaded`);
      return NextResponse.json({ error: 'No PDF file uploaded' }, { status: 400 });
    }
    
    if (!file.type.includes('pdf')) {
      console.error(`[${requestId}] Invalid file type: ${file.type}`);
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      console.error(`[${requestId}] File too large: ${file.size} bytes`);
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 });
    }
    
    if (voiceFile && voiceFile.size > 25 * 1024 * 1024) { // 25MB limit for audio
      console.error(`[${requestId}] Voice file too large: ${voiceFile.size} bytes`);
      return NextResponse.json({ error: 'Voice file size must be under 25MB' }, { status: 400 });
    }
    
    if (!process.env.OPENAI_API_KEY) {
      console.error(`[${requestId}] OpenAI API key not configured`);
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    if (!openai) {
      console.error(`[${requestId}] OpenAI client not initialized`);
      return NextResponse.json({ error: 'OpenAI service unavailable' }, { status: 500 });
    }
    
    console.log(`[${requestId}] Processing combined extraction:`, {
      pdfName: file.name,
      pdfSize: file.size,
      pdfType: file.type,
      hasVoice: !!voiceFile,
      voiceSize: voiceFile?.size,
      voiceType: voiceFile?.type
    });
    
    try {
      // Step 1: Process PDF using OpenAI (avoiding pdf-parse debug mode issues)
      console.log(`[${requestId}] Starting PDF processing via OpenAI...`);
      
      let pdfContent = '';
      
      // Variables for cleanup
      let uploadedFile: any = null;
      let assistant: any = null;
      let thread: any = null;
      
      try {
        // Force pdf-parse to bypass debug mode by manipulating module context
        console.log(`[${requestId}] Processing PDF via pdf-parse with debug mode override...`);
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        try {
          // Direct approach: Import pdf-parse library internals to bypass debug mode
          const path = require('path');
          const fs = require('fs');
          
          // Import the actual PDF parsing library directly from lib folder
          const pdfParseLib = require('pdf-parse/lib/pdf-parse.js');
          
          console.log(`[${requestId}] Using direct pdf-parse library import to avoid debug mode...`);
          
          const parsed = await pdfParseLib(buffer);
          pdfContent = parsed.text || '';
          
          console.log(`[${requestId}] PDF parsed successfully via direct lib import:`, {
            contentLength: pdfContent.length,
            pages: parsed.numpages,
            preview: pdfContent.substring(0, 200) + (pdfContent.length > 200 ? '...' : '')
          });
          
        } catch (pdfParseError: any) {
          console.warn(`[${requestId}] Direct pdf-parse failed, using basic text extraction:`, pdfParseError.message);
          
          // Final fallback: Return clear failure message so AI doesn't hallucinate
          pdfContent = `[PDF_EXTRACTION_FAILED] Unable to extract text from "${file.name}". The PDF may be scanned, password-protected, or corrupted. Please provide a text-based PDF with selectable content.`;
          
          console.log(`[${requestId}] Using clear extraction failure message`);
        }
        
        console.log(`[${requestId}] PDF content extraction completed:`, {
          contentLength: pdfContent.length,
          preview: pdfContent.substring(0, 200) + (pdfContent.length > 200 ? '...' : '')
        });
        
        // Enhanced logging for debugging PDF content issues
        console.log(`[${requestId}] PDF extraction success - Content preview:`, {
          hasContent: pdfContent.length > 0,
          startsWithExpected: pdfContent.toLowerCase().includes('tcs floor service') || pdfContent.toLowerCase().includes('customer information'),
          containsKeywords: {
            company: pdfContent.toLowerCase().includes('meridian') || pdfContent.toLowerCase().includes('business center'),
            service: pdfContent.toLowerCase().includes('floor stripping') || pdfContent.toLowerCase().includes('waxing'),
            pricing: pdfContent.toLowerCase().includes('$') || pdfContent.toLowerCase().includes('total'),
            contact: pdfContent.toLowerCase().includes('sarah') || pdfContent.toLowerCase().includes('johnson')
          }
        });
        
        if (!pdfContent || pdfContent.trim().length < 10) {
          console.error(`[${requestId}] CRITICAL: PDF content extraction yielded minimal content:`, {
            contentLength: pdfContent.length,
            content: pdfContent,
            fileInfo: {
              name: file.name,
              size: file.size,
              type: file.type
            },
            extractionMethod: 'pdf-parse-direct'
          });
          return NextResponse.json({ 
            error: 'PDF content extraction failed - No readable text found',
            details: 'The PDF appears to be empty, corrupted, password-protected, or contains only images/scanned content that cannot be read. Please ensure the PDF contains selectable text.',
            debugInfo: {
              requestId,
              fileSize: file.size,
              fileName: file.name,
              extractedLength: pdfContent.length,
              stage: 'pdf-text-extraction'
            }
          }, { status: 400 });
        }
        
      } catch (pdfError: any) {
        console.error(`[${requestId}] PDF processing failed:`, pdfError);
        return NextResponse.json({ 
          error: 'Failed to process PDF',
          details: pdfError.message || 'The PDF file may be corrupted, password-protected, or in an unsupported format'
        }, { status: 400 });
      } finally {
        // Clean up OpenAI resources if used
        if (uploadedFile && openai) {
          openai.files.delete(uploadedFile.id).catch((err: any) => 
            console.warn(`[${requestId}] Failed to delete file:`, err)
          );
        }
      }
      
      // Step 2: Process voice transcription if provided
      let voiceTranscription = '';
      let voiceProcessingError = null;
      
      if (voiceFile) {
        console.log(`[${requestId}] Processing voice transcription...`);
        
        try {
          console.log(`[${requestId}] Starting Whisper transcription for file:`, {
            name: voiceFile.name,
            size: voiceFile.size,
            type: voiceFile.type
          });
          
          const transcription = await openai.audio.transcriptions.create({
            file: voiceFile,
            model: 'whisper-1',
            language: 'en',
            response_format: 'text',
            prompt: 'This is a recording about a floor service job including details about square footage, floor type, timeline, customer information, and special requirements.'
          });
          
          voiceTranscription = transcription || '';
          console.log(`[${requestId}] Voice transcription completed successfully:`, {
            length: voiceTranscription.length,
            preview: voiceTranscription.substring(0, 100) + (voiceTranscription.length > 100 ? '...' : '')
          });
        } catch (voiceError: any) {
          voiceProcessingError = {
            message: voiceError.message,
            code: voiceError.code,
            type: voiceError.type,
            status: voiceError.status
          };
          console.error(`[${requestId}] Voice transcription failed:`, voiceProcessingError);
          
          // If voice processing fails, continue with PDF only but track the error
          console.warn(`[${requestId}] Continuing with PDF-only processing due to voice error`);
        }
      }
      
      // Step 3: Combined data extraction from PDF and voice
      console.log(`[${requestId}] Starting combined data extraction...`, {
        hasVoiceTranscription: !!voiceTranscription,
        voiceTranscriptionLength: voiceTranscription.length,
        voiceProcessingError: !!voiceProcessingError
      });
      
      // Enhanced PDF content validation
      console.log(`[${requestId}] Preparing extraction with PDF content length: ${pdfContent.length}`);
      
      const extractionPrompt = `You are a floor service operations expert who extracts structured data from proposal documents to create detailed purchase orders.

PRIMARY DATA SOURCE - PDF DOCUMENT CONTENT:
"${pdfContent.substring(0, 8000)}${pdfContent.length > 8000 ? '...[content truncated]' : ''}"

CRITICAL INSTRUCTION: The PDF document above is your PRIMARY and MAIN data source. Extract ALL information from this PDF first.

PDF CONTENT VALIDATION: This PDF content should contain floor service proposal information including customer details, service specifications, pricing, and contact information. If this content appears to be placeholder text or unrelated to floor services, return an error.

${voiceTranscription ? `SUPPLEMENTARY VOICE CONTEXT (Use ONLY to enhance/clarify PDF data):
"${voiceTranscription}"

VOICE ENHANCEMENT RULES:
- PDF data takes ABSOLUTE PRIORITY - never override PDF information with voice data
- Use voice ONLY to fill gaps where PDF has no information  
- Use voice to add supplementary details to special_requirements or notes fields
- Use voice to clarify ambiguous PDF content, but keep PDF data as the source of truth
- If voice contradicts PDF, always use the PDF data` : ''}

EXTRACTION WORKFLOW:
1. FIRST: Extract ALL data from the PDF document content above
2. SECOND: Parse customer information, addresses, pricing, and specifications from PDF
3. THIRD: Extract job details, timelines, and requirements from PDF
${voiceTranscription ? `4. FINALLY: Use voice notes ONLY to enhance or add missing details that aren't in PDF` : ''}

PRIMARY DATA EXTRACTION FROM PDF:
1. Customer Information: Company name, contacts, phone numbers, addresses
2. Job Site Details: Service address, city, state, ZIP code  
3. Service Specifications: Floor type, square footage, service description
4. Timeline: Requested dates, deadlines, scheduling requirements
5. Pricing: Line items, costs, totals from PDF
6. Special Requirements: Access needs, timing restrictions, material specifications
7. Subcontractor Info: Company details if mentioned

Return ONLY valid JSON using this exact schema:
${JSON.stringify(FIELD_SCHEMA, null, 2)}

REMEMBER: Extract primarily from PDF document content. Voice is supplementary enhancement only.`;

      let completion;
      try {
        console.log(`[${requestId}] Calling OpenAI GPT-4o for extraction...`);
        
        completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: 'You are a floor service data extraction expert. Extract structured information from proposal documents and optional voice recordings to create detailed purchase orders. Return ONLY valid JSON with exact field names provided.' 
            },
            { 
              role: 'user', 
              content: extractionPrompt
            }
          ],
          temperature: 0,
          max_tokens: 1500,
          response_format: { type: 'json_object' }
        });
        
        console.log(`[${requestId}] OpenAI extraction completed:`, {
          model: completion.model,
          usage: completion.usage,
          finishReason: completion.choices[0]?.finish_reason
        });
        
      } catch (openaiError: any) {
        console.error(`[${requestId}] OpenAI extraction failed:`, {
          message: openaiError.message,
          code: openaiError.code,
          type: openaiError.type,
          status: openaiError.status,
          request_id: openaiError.request_id
        });
        
        if (openaiError.code === 'invalid_request_error') {
          return NextResponse.json({ 
            error: 'Invalid request to AI service',
            details: 'The PDF format may not be supported or the file may be corrupted',
            openaiError: openaiError.message
          }, { status: 400 });
        }
        
        if (openaiError.code === 'rate_limit_exceeded') {
          return NextResponse.json({ 
            error: 'Service temporarily unavailable',
            details: 'Please try again in a few moments',
            retryAfter: 30
          }, { status: 429 });
        }
        
        throw openaiError; // Re-throw to be caught by outer catch
      }
      
      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        console.error(`[${requestId}] Empty response from OpenAI extraction`);
        return NextResponse.json({ 
          error: 'Empty response from AI service',
          details: 'The AI service returned no content. The PDF may be unreadable or contain no extractable text.'
        }, { status: 500 });
      }
      
      console.log(`[${requestId}] Raw OpenAI response:`, {
        length: responseContent.length,
        preview: responseContent.substring(0, 200) + (responseContent.length > 200 ? '...' : '')
      });
      
      let extractedData;
      try {
        extractedData = JSON.parse(responseContent);
        console.log(`[${requestId}] Successfully parsed extraction data:`, { 
          keys: Object.keys(extractedData),
          keyCount: Object.keys(extractedData).length,
          hasVoiceContext: !!voiceTranscription
        });
      } catch (parseError: any) {
        console.error(`[${requestId}] JSON parse error:`, {
          error: parseError.message,
          rawContent: responseContent
        });
        return NextResponse.json({ 
          error: 'Invalid response format from AI service',
          details: `Failed to parse AI response as JSON: ${parseError.message}`,
          debugInfo: {
            rawResponse: responseContent.substring(0, 500),
            parseError: parseError.message
          }
        }, { status: 500 });
      }
      
      // Ensure all fields exist and add defaults
      const result = { ...FIELD_SCHEMA, ...extractedData };
      result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      result.po_date = result.po_date || new Date().toISOString().split('T')[0];
      
      // Add document reference
      result.doc_reference = voiceTranscription 
        ? `${file.name} + Voice Recording`
        : file.name;
      
      console.log(`[${requestId}] Combined extraction completed successfully:`, {
        pdfName: file.name,
        pdfSize: file.size,
        pdfContentLength: pdfContent.length,
        hasVoice: !!voiceTranscription,
        voiceLength: voiceTranscription.length,
        voiceProcessingError: !!voiceProcessingError,
        fieldsExtracted: Object.keys(extractedData).length,
        totalFields: Object.keys(result).length,
        keyFields: {
          customerCompany: result.customer_company || '[not found]',
          serviceType: result.service_type || '[not found]',
          squareFootage: result.square_footage || '[not found]',
          total: result.total || '[not found]',
          city: result.city || '[not found]',
          poNumber: result.po_number
        },
        extractionQuality: {
          hasCustomerInfo: !!(result.customer_company && result.customer_company.length > 0),
          hasServiceInfo: !!(result.service_type && result.service_type.length > 0),
          hasPricing: !!(result.total && result.total.length > 0),
          hasLocation: !!(result.city && result.city.length > 0)
        }
      });
      
      // Include enhanced debug information in response for troubleshooting
      const response = {
        ...result,
        _debug: {
          requestId,
          processing: {
            pdfProcessed: true,
            pdfContentLength: pdfContent.length,
            voiceProcessed: !!voiceTranscription,
            voiceError: voiceProcessingError,
            fieldsExtracted: Object.keys(extractedData).length,
            totalFields: Object.keys(result).length
          },
          pdfExtraction: {
            fileName: file.name,
            fileSize: file.size,
            contentExtracted: pdfContent.length > 0,
            keyDataFound: {
              hasCustomer: !!(result.customer_company && result.customer_company.length > 0),
              hasService: !!(result.service_type && result.service_type.length > 0),
              hasPricing: !!(result.total && result.total.length > 0),
              hasAddress: !!(result.project_address && result.project_address.length > 0)
            }
          }
        }
      };
      
      return NextResponse.json(response);
      
    } catch (processingError: any) {
      console.error(`[${requestId}] Processing error in combined extraction:`, {
        message: processingError.message,
        code: processingError.code,
        type: processingError.type,
        stack: processingError.stack?.substring(0, 500)
      });
      
      // Determine error type and provide specific feedback
      if (processingError.code === 'invalid_request_error') {
        return NextResponse.json({ 
          error: 'Invalid request to AI service',
          details: processingError.message || 'The file format may not be supported',
          debugInfo: {
            requestId,
            errorCode: processingError.code,
            errorType: processingError.type
          }
        }, { status: 400 });
      }
      
      if (processingError.code === 'rate_limit_exceeded') {
        return NextResponse.json({ 
          error: 'Service rate limit exceeded',
          details: 'Too many requests. Please wait before trying again.',
          retryAfter: 60
        }, { status: 429 });
      }
      
      if (processingError.message?.includes('timeout')) {
        return NextResponse.json({ 
          error: 'Processing timeout',
          details: 'The document processing took too long. Please try with a smaller file.',
          debugInfo: { requestId }
        }, { status: 408 });
      }
      
      return NextResponse.json({ 
        error: 'Document processing failed',
        details: processingError.message || 'An unexpected error occurred during processing',
        debugInfo: {
          requestId,
          errorCode: processingError.code,
          errorType: processingError.type,
          stage: 'document-processing'
        }
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error(`[${requestId}] Unexpected request error:`, {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack?.substring(0, 1000)
    });
    
    return NextResponse.json({ 
      error: 'Unexpected server error',
      details: error.message || 'An unexpected error occurred while processing your request',
      debugInfo: {
        requestId,
        errorName: error.name,
        stage: 'request-processing'
      }
    }, { status: 500 });
  }
}
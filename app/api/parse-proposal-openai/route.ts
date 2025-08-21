import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { Readable } from 'stream';
import { createErrorResponse, createSuccessResponse } from '@/lib/error-response';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Field schema
const FIELD_SCHEMA = {
  po_date: '',
  po_number: '',
  customer_first_name: '',
  customer_last_name: '',
  customer_company: '',
  onsite_contact_name: '',
  onsite_contact_phone: '',
  customer_phone: '',
  customer_email: '',
  billing_address: '',
  project_address: '',
  city: '',
  state: '',
  zip: '',
  service_type: '',
  floor_type: '',
  square_footage: '',
  unit_price: '',
  subtotal: '',
  tax: '',
  total: '',
  timeline: '',
  requested_service_date: '',
  special_requirements: '',
  doc_reference: '',
  notes: ''
};

interface UploadedFile {
  id: string;
}

interface Assistant {
  id: string;
}

export async function POST(request: NextRequest) {
  let uploadedFile: UploadedFile | null = null;
  let assistant: Assistant | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return createErrorResponse('No file uploaded', 400);
    }
    
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return createErrorResponse('OpenAI API key not configured', 500);
    }
    
    console.log('Processing file:', file.name, 'Size:', file.size);
    
    try {
      // Convert File to a format OpenAI accepts
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create a File object that OpenAI can accept
      const openAIFile = new File([buffer], file.name, { type: 'application/pdf' });
      
      console.log('Uploading file to OpenAI...');
      
      // Upload file to OpenAI
      uploadedFile = await openai.files.create({
        file: openAIFile,
        purpose: 'assistants'
      });
      
      console.log('File uploaded to OpenAI:', uploadedFile.id);
      
      // Create an assistant that can read files
      assistant = await openai.beta.assistants.create({
        name: 'PDF Data Extractor',
        instructions: `You are a data extraction expert. Extract information from the uploaded TCS floor service proposal PDF and return ONLY a JSON object with these exact fields: ${JSON.stringify(FIELD_SCHEMA, null, 2)}. Focus on finding customer/facility name, square footage, service type, pricing, addresses, and contact info.`,
        tools: [{ type: 'file_search' }],
        model: 'gpt-4o-mini'
      });
      
      console.log('Assistant created:', assistant.id);
      
      // Create a thread and attach the file
      const thread = await openai.beta.threads.create({
        messages: [{
          role: 'user',
          content: 'Please extract all purchase order information from the attached PDF and return it as JSON.',
          attachments: [{
            file_id: uploadedFile.id,
            tools: [{ type: 'file_search' }]
          }]
        }]
      });
      
      console.log('Thread created:', thread.id);
      
      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id
      });
      
      console.log('Run created:', run.id);
      
      // Wait for completion
      let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
        console.log('Run status:', runStatus.status);
      }
      
      if (runStatus.status === 'failed') {
        console.error('Run failed:', runStatus);
        throw new Error('OpenAI processing failed');
      }
      
      // Get the messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');
      
      if (!assistantMessage || !assistantMessage.content[0]) {
        throw new Error('No response from assistant');
      }
      
      const textContent = assistantMessage.content[0];
      if (textContent.type !== 'text') {
        throw new Error('Unexpected response type');
      }
      
      console.log('Assistant response:', textContent.text.value);
      
      // Parse the JSON response
      let extractedData;
      try {
        // Extract JSON from the response (in case it's wrapped in markdown)
        const jsonMatch = textContent.text.value.match(/```json\n?([\s\S]*?)\n?```/) || 
                          textContent.text.value.match(/{[\s\S]*}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textContent.text.value;
        extractedData = JSON.parse(jsonStr);
      } catch (parseError: any) {
        console.error('Failed to parse assistant response as JSON:', parseError);
        throw new Error('Failed to parse extraction results');
      }
      
      // Cleanup will happen in finally block
      
      // Ensure all fields exist and add defaults
      const result = { ...FIELD_SCHEMA, ...extractedData };
      result.po_number = result.po_number || `PO-${Math.floor(100000 + Math.random() * 900000)}`;
      result.po_date = result.po_date || new Date().toISOString().split('T')[0];
      
      console.log('Extraction complete');
      
      return createSuccessResponse(result);
      
    } catch (openAIError: any) {
      console.error('OpenAI error:', openAIError);
      return createErrorResponse(
        'Failed to process PDF with OpenAI',
        500,
        openAIError.message
      );
    } finally {
      // Clean up resources even if an error occurred
      const cleanupPromises = [];
      
      if (uploadedFile) {
        cleanupPromises.push(
          openai.files.delete(uploadedFile.id).catch((err: any) => 
            console.error('Failed to delete file:', err)
          )
        );
      }
      
      if (assistant) {
        cleanupPromises.push(
          openai.beta.assistants.delete(assistant.id).catch((err: any) => 
            console.error('Failed to delete assistant:', err)
          )
        );
      }
      
      if (cleanupPromises.length > 0) {
        await Promise.allSettled(cleanupPromises);
      }
    }
    
  } catch (error: any) {
    console.error('Request processing error:', error);
    return createErrorResponse(
      error.message || 'Failed to process request',
      500,
      error.stack
    );
  }
}
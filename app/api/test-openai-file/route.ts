import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Readable } from 'stream';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    if (!openai) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    
    console.log(`[test-openai-file] Processing ${file.name}`);
    
    // Convert File to a format OpenAI accepts
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create a Blob that OpenAI can accept
    const blob = new Blob([buffer], { type: 'application/pdf' });
    
    // Upload file to OpenAI
    console.log('[test-openai-file] Uploading to OpenAI...');
    const uploadedFile = await openai.files.create({
      file: new File([blob], file.name, { type: 'application/pdf' }),
      purpose: 'assistants'
    });
    
    console.log('[test-openai-file] File uploaded:', uploadedFile.id);
    
    // Create an assistant that can read files
    console.log('[test-openai-file] Creating assistant...');
    const assistant = await openai.beta.assistants.create({
      name: 'PDF Reader',
      instructions: 'You are a helpful assistant that reads and analyzes PDF documents.',
      model: 'gpt-4-turbo',
      tools: [{ type: 'file_search' }]
    });
    
    // Create a thread and message
    console.log('[test-openai-file] Creating thread...');
    const thread = await openai.beta.threads.create();
    
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: 'Please read this PDF and provide a summary of its contents. What type of document is it and what are the key details?',
      attachments: [{ file_id: uploadedFile.id, tools: [{ type: 'file_search' }] }]
    });
    
    // Run the assistant
    console.log('[test-openai-file] Running assistant...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });
    
    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id as any);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id as any);
      console.log('[test-openai-file] Run status:', runStatus.status);
      
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed: ' + JSON.stringify(runStatus));
      }
    }
    
    // Get the response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(m => m.role === 'assistant');
    
    // Clean up
    try {
      await openai.files.delete(uploadedFile.id);
      await openai.beta.assistants.delete(assistant.id);
    } catch (e) {
      console.error('[test-openai-file] Cleanup error:', e);
    }
    
    return NextResponse.json({
      success: true,
      fileId: uploadedFile.id,
      summary: (assistantMessage?.content[0] as any)?.text?.value || 'No response',
      rawResponse: assistantMessage
    });
    
  } catch (error: any) {
    console.error('[test-openai-file] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process PDF',
      details: error.response?.data || error
    }, { status: 500 });
  }
}
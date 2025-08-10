const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testDirectOpenAI() {
  try {
    console.log('Testing direct OpenAI file upload...');
    
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not set');
      return;
    }
    
    // Use a test PDF
    const testPdfPath = path.join(__dirname, 'node_modules/pdf-parse/test/data/04-valid.pdf');
    if (!fs.existsSync(testPdfPath)) {
      console.error('Test PDF not found');
      return;
    }
    
    // Read the PDF
    const pdfBuffer = fs.readFileSync(testPdfPath);
    console.log('PDF size:', pdfBuffer.length, 'bytes');
    
    // Create a File-like object for OpenAI
    const file = new File([pdfBuffer], 'test.pdf', { type: 'application/pdf' });
    
    console.log('Uploading to OpenAI...');
    
    // Upload file
    const uploadedFile = await openai.files.create({
      file: file,
      purpose: 'assistants'
    });
    
    console.log('✅ File uploaded successfully:', uploadedFile.id);
    console.log('File details:', {
      id: uploadedFile.id,
      filename: uploadedFile.filename,
      bytes: uploadedFile.bytes,
      created_at: uploadedFile.created_at
    });
    
    // Create assistant
    console.log('\nCreating assistant...');
    const assistant = await openai.beta.assistants.create({
      name: 'PDF Test',
      instructions: 'Extract text from the PDF and summarize what you find.',
      tools: [{ type: 'file_search' }],
      model: 'gpt-4o-mini'
    });
    
    console.log('✅ Assistant created:', assistant.id);
    
    // Create thread with file
    console.log('\nCreating thread...');
    const thread = await openai.beta.threads.create({
      messages: [{
        role: 'user',
        content: 'What is in this PDF?',
        attachments: [{
          file_id: uploadedFile.id,
          tools: [{ type: 'file_search' }]
        }]
      }]
    });
    
    console.log('✅ Thread created:', thread.id);
    
    // Run assistant
    console.log('\nRunning assistant...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });
    
    console.log('Run started:', run.id);
    console.log('Thread ID for retrieve:', thread.id);
    console.log('Run ID for retrieve:', run.id);
    
    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
    }
    
    console.log('\nRun status:', runStatus.status);
    
    if (runStatus.status === 'failed') {
      console.error('Run failed:', runStatus);
      return;
    }
    
    // Get response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(m => m.role === 'assistant');
    
    if (assistantMessage && assistantMessage.content[0]) {
      console.log('\n✅ SUCCESS! OpenAI can read the PDF:');
      console.log('Response:', assistantMessage.content[0].text.value);
    }
    
    // Cleanup
    console.log('\nCleaning up...');
    await openai.files.delete(uploadedFile.id);
    await openai.beta.assistants.delete(assistant.id);
    console.log('✅ Cleanup complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testDirectOpenAI();
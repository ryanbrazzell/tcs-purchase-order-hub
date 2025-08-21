import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function GET() {
  const debugInfo: any = {
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.OPENAI_API_KEY,
    apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
  };

  if (!process.env.OPENAI_API_KEY || !openai) {
    return NextResponse.json({ 
      error: 'OpenAI API key not configured',
      debug: debugInfo 
    }, { status: 500 });
  }

  try {
    debugInfo.testPrompt = 'Return a JSON object with a single field "test" containing the value "success"';
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful assistant that returns JSON.' 
        },
        { 
          role: 'user', 
          content: debugInfo.testPrompt
        }
      ],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' }
    });

    debugInfo.response = {
      id: completion.id,
      model: completion.model,
      usage: completion.usage,
      content: completion.choices[0]?.message?.content
    };

    let parsed;
    try {
      parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
      debugInfo.parsed = parsed;
    } catch (e: any) {
      debugInfo.parseError = e.message;
    }

    return NextResponse.json({
      success: true,
      parsed,
      debug: debugInfo
    });

  } catch (error: any) {
    debugInfo.error = {
      message: error.message,
      type: error.constructor.name,
      response: error.response?.data
    };

    return NextResponse.json({
      error: 'OpenAI API test failed',
      debug: debugInfo
    }, { status: 500 });
  }
}
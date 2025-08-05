import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      keyLength: process.env.ANTHROPIC_API_KEY?.length,
      keyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 20) + '...',
      keySuffix: '...' + process.env.ANTHROPIC_API_KEY?.substring(process.env.ANTHROPIC_API_KEY.length - 10),
    },
    checks: {
      canImportAnthropicSDK: false,
      canCreateClient: false,
      canCallAPI: false,
      apiError: null
    }
  };

  try {
    // Check 1: Can import SDK
    diagnostics.checks.canImportAnthropicSDK = true;

    // Check 2: Can create client
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'missing',
    });
    diagnostics.checks.canCreateClient = true;

    // Check 3: Can call API with a simple test
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const response = await client.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: 'Say "test"'
          }]
        });
        diagnostics.checks.canCallAPI = true;
        diagnostics.checks.apiResponse = response.content[0];
      } catch (apiError: any) {
        diagnostics.checks.apiError = {
          name: apiError.name,
          message: apiError.message,
          status: apiError.status,
          type: apiError.error?.type,
          code: apiError.error?.error?.code
        };
      }
    }
  } catch (error: any) {
    diagnostics.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  // Check pdf-parse
  try {
    const pdf = await import('pdf-parse');
    diagnostics.checks.canImportPdfParse = true;
    diagnostics.checks.pdfParseVersion = (pdf as any).version || 'unknown';
  } catch (error: any) {
    diagnostics.checks.pdfParseError = error.message;
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
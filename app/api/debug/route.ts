import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET(request: NextRequest) {
  const rawKey = process.env.ANTHROPIC_API_KEY;
  const trimmedKey = rawKey?.trim();
  
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasAnthropicKey: !!rawKey,
      rawKeyLength: rawKey?.length,
      trimmedKeyLength: trimmedKey?.length,
      keyHasNewline: rawKey !== trimmedKey,
      keyPrefix: trimmedKey?.substring(0, 20) + '...',
      keySuffix: '...' + trimmedKey?.substring(trimmedKey.length - 10),
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

    // Check 2: Can create client (with trimmed key)
    const client = new Anthropic({
      apiKey: trimmedKey || 'missing',
    });
    diagnostics.checks.canCreateClient = true;

    // Check 3: Can call API with a simple test
    if (trimmedKey) {
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
import { NextRequest, NextResponse } from 'next/server';
import { ErrorReporter } from '@/lib/error-reporter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, error, context } = body;
    
    await ErrorReporter.report(source || 'unknown', error, context);
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to report error:', e);
    return NextResponse.json({ error: 'Failed to report error' }, { status: 500 });
  }
}
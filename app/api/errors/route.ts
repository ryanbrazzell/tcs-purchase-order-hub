import { NextRequest, NextResponse } from 'next/server';
import { ErrorReporter } from '@/lib/error-reporter';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const since = url.searchParams.get('since');
  const source = url.searchParams.get('source');

  const errors = await ErrorReporter.getErrors(
    since || undefined,
    source || undefined
  );

  return NextResponse.json({
    errors,
    count: errors.length,
    since,
    source
  });
}

export async function DELETE() {
  await ErrorReporter.clearErrors();
  return NextResponse.json({ success: true });
}
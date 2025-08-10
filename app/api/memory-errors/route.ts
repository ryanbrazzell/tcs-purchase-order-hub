import { NextRequest, NextResponse } from 'next/server';
import { MemoryErrorStore } from '@/lib/memory-error-store';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const minutes = parseInt(url.searchParams.get('minutes') || '5');
  
  const errors = MemoryErrorStore.getRecent(minutes);
  
  return NextResponse.json({
    errors,
    count: errors.length,
    minutes,
    message: errors.length === 0 ? 'No recent errors found' : undefined
  });
}

// Also provide a way to check via POST with a secret
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simple auth check
    if (body.check !== 'show-errors-2024') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const errors = MemoryErrorStore.getAll();
    
    return NextResponse.json({
      errors,
      count: errors.length,
      recent: MemoryErrorStore.getRecent(5)
    });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
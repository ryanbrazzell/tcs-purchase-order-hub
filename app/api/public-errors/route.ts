import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Make this endpoint public by adding specific headers
export async function GET(request: NextRequest) {
  // Add CORS headers to make it accessible
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Content-Type': 'application/json',
  };

  try {
    const errorFile = path.join(process.cwd(), 'errors.json');
    
    if (!fs.existsSync(errorFile)) {
      return NextResponse.json({ errors: [], count: 0 }, { headers });
    }

    const content = fs.readFileSync(errorFile, 'utf-8');
    const errors = JSON.parse(content);
    
    // Get only recent errors (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentErrors = errors.filter((e: any) => new Date(e.timestamp) > fiveMinutesAgo);

    return NextResponse.json({
      errors: recentErrors,
      count: recentErrors.length,
      totalErrors: errors.length
    }, { headers });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Failed to read errors',
      message: error.message 
    }, { headers, status: 500 });
  }
}
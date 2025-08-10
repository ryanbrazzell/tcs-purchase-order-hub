import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'GET method works',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    return NextResponse.json({ 
      message: 'POST method works',
      timestamp: new Date().toISOString(),
      receivedBody: body ? 'Yes' : 'No'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Error in POST',
      message: error.message 
    }, { status: 500 });
  }
}
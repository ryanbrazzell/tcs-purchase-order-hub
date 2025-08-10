import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[simple-parse] Received POST request');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ 
        error: 'No file uploaded',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString(),
      message: 'This is a test endpoint to verify POST works'
    });
    
  } catch (error: any) {
    console.error('[simple-parse] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process request',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
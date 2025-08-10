import { NextRequest, NextResponse } from 'next/server';

// In-memory log storage (will reset on server restart)
let logs: any[] = [];
const MAX_LOGS = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...body
    };
    
    logs.push(logEntry);
    
    // Keep only the most recent logs
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(-MAX_LOGS);
    }
    
    console.log('[logs] Received log:', logEntry);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[logs] Error storing log:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const since = url.searchParams.get('since');
  const level = url.searchParams.get('level');
  
  let filteredLogs = logs;
  
  if (since) {
    const sinceDate = new Date(since);
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) > sinceDate);
  }
  
  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }
  
  return NextResponse.json({
    logs: filteredLogs,
    total: filteredLogs.length
  });
}
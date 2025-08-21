import { NextResponse } from 'next/server';

export interface StandardErrorResponse {
  error: string;
  details?: string;
  timestamp: string;
  code?: string;
}

export function createErrorResponse(
  message: string,
  status: number,
  details?: string,
  code?: string
): NextResponse {
  const errorResponse: StandardErrorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
    ...(code && { code })
  };

  return NextResponse.json(errorResponse, { status });
}

export function createSuccessResponse<T>(data: T): NextResponse {
  return NextResponse.json(data);
}
import toast from 'react-hot-toast';

// Custom error classes
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class FileError extends AppError {
  constructor(message: string) {
    super(message, 'FILE_ERROR', 400);
    this.name = 'FileError';
  }
}

export class ExtractionError extends AppError {
  constructor(message: string) {
    super(message, 'EXTRACTION_ERROR', 500);
    this.name = 'ExtractionError';
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR', 500);
    this.name = 'StorageError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', 503);
    this.name = 'NetworkError';
  }
}

// Error handler function
export function handleError(error: unknown): void {
  console.error('Error caught:', error);
  
  if (error instanceof AppError) {
    // Handle known application errors
    switch (error.code) {
      case 'VALIDATION_ERROR':
        toast.error(error.message);
        break;
      case 'FILE_ERROR':
        toast.error(error.message);
        break;
      case 'EXTRACTION_ERROR':
        toast.error('PDF extraction failed. Please try again or enter data manually.');
        break;
      case 'STORAGE_ERROR':
        toast.error('Failed to save data. Please check your browser settings.');
        break;
      case 'NETWORK_ERROR':
        toast.error('Network error. Please check your connection.');
        break;
      default:
        toast.error('An unexpected error occurred.');
    }
  } else if (error instanceof Error) {
    // Handle generic errors
    toast.error(error.message);
  } else {
    // Handle unknown errors
    toast.error('An unexpected error occurred.');
  }
}

// Async error wrapper
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T
): T {
  return (async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error);
      throw error;
    }
  }) as T;
}

// Form validation error formatter
export function formatValidationErrors(errors: Record<string, string[]>): string {
  const messages = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('\n');
  return messages;
}

// API error response handler
export function handleAPIError(error: unknown): Response {
  console.error('API Error:', error);
  
  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        code: error.code
      }),
      {
        status: error.statusCode || 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Retry logic for network operations
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

// Error boundary fallback component props
export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size must be less than 10MB',
  INVALID_FILE_TYPE: 'Only PDF files are allowed',
  EXTRACTION_FAILED: 'Failed to extract data from PDF. Please try again or enter manually.',
  SAVE_FAILED: 'Failed to save your work. Please try again.',
  LOAD_FAILED: 'Failed to load data. Please refresh the page.',
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  VALIDATION_ERROR: 'Please check the form for errors.',
  GENERIC_ERROR: 'Something went wrong. Please try again.'
} as const;
import { NextRequest, NextResponse } from 'next/server';

// Mock data structure that matches the ExtractPDFResponse type
const mockExtractedData = {
  success: true,
  documentType: 'proposal' as const,
  extractedData: {
    customer: {
      companyName: "ABC Corporation (Mock)",
      contactName: "John Smith",
      email: "john@abc.com",
      phone: "555-123-4567",
      jobLocation: "123 Main St, City, State 12345",
      onsiteContactName: "Jane Doe",
      onsiteContactPhone: "555-987-6543"
    },
    job: {
      requestedServiceDate: "2024-12-01",
      squareFootage: 5000,
      floorType: "Concrete",
      description: "Floor cleaning and sealing service",
      poNumber: "PO-" + Date.now().toString().slice(-6)
    },
    lineItems: [
      {
        description: "Floor Cleaning",
        quantity: 5000,
        unit: "sq ft",
        unitPrice: 0.50,
        total: 2500.00
      },
      {
        description: "Floor Sealing",
        quantity: 5000,
        unit: "sq ft",
        unitPrice: 0.75,
        total: 3750.00
      }
    ]
  }
};

export async function POST(request: NextRequest) {
  try {
    // Log that we received a request
    console.log('Mock extraction endpoint called at:', new Date().toISOString());
    
    // Get the form data (we'll ignore the actual PDF for now)
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No PDF file provided'
      }, { status: 400 });
    }
    
    // Log file details
    console.log('Received file:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    // Simulate a small delay like a real API would have
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock data
    return NextResponse.json(mockExtractedData);
    
  } catch (error) {
    console.error('Mock extraction error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Test endpoint to verify the API is accessible
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Mock extraction endpoint is ready',
    expectedMethod: 'POST',
    expectedBody: 'FormData with "pdf" field',
    willReturn: 'Mock extracted data'
  });
}
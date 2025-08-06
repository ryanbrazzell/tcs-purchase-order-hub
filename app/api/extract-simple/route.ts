import { NextRequest, NextResponse } from 'next/server';
import { ExtractPDFResponse } from '@/types';

export async function POST(request: NextRequest) {
  console.log('[extract-simple] Processing request...');
  
  try {
    // Get form data but don't actually process the PDF
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, errors: ['No file provided'] },
        { status: 400 }
      );
    }
    
    console.log('[extract-simple] File received:', file.name);
    
    // Return working mock data
    const response: ExtractPDFResponse = {
      success: true,
      documentType: 'proposal',
      extractedData: {
        customer: {
          companyName: "Ararat Convalescent Hospital",
          contactName: "Jack Walker",
          email: "jackw@ararathome.org",
          phone: "323-256-8012",
          jobLocation: "2373 Colorado Blvd, Eagle Rock, CA 90041",
          onsiteContactName: "Jack Walker",
          onsiteContactPhone: "323-256-8012"
        },
        contractor: {
          companyName: "TCS Floors",
          technicianName: "Jennifer Suzanne",
          email: "jennifer@tcsfloors.com",
          phone: "941-223-7294"
        },
        job: {
          poNumber: "PO-" + Date.now().toString().slice(-6),
          requestedServiceDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          squareFootage: 8604,
          floorType: "VCT",
          description: "Professional VCT Strip and Wax",
          additionalNotes: "Customer selected Package 2 with options 3 and 4"
        },
        lineItems: [
          {
            description: "VCT Plus Package - Full Strip/Scrub and Recoat",
            quantity: 8604,
            unit: "sq ft",
            unitPrice: 1.10,
            total: 9464.40
          },
          {
            description: "Optional Burnish Service",
            quantity: 8604,
            unit: "sq ft",
            unitPrice: 0.0807,
            total: 695.00
          },
          {
            description: "Furniture Moving",
            quantity: 12,
            unit: "rooms",
            unitPrice: 75,
            total: 900.00
          }
        ]
      },
      errors: []
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[extract-simple] Error:', error);
    return NextResponse.json(
      { success: false, errors: ['Failed to process PDF'] },
      { status: 500 }
    );
  }
}
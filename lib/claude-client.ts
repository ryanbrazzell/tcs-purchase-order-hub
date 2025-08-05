import Anthropic from '@anthropic-ai/sdk';
import { ExtractionError, NetworkError, retryWithBackoff } from './errors';
import { CustomerInfo, ContractorInfo, JobDetails, LineItem } from '@/types';

// Initialize Anthropic client lazily to ensure env var is available
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

export interface ExtractionRequest {
  text: string;
  documentType?: 'proposal' | 'purchase_order' | 'unknown';
}

export interface ExtractionResponse {
  documentType: 'proposal' | 'purchase_order';
  confidence: number;
  extractedData: {
    customer?: Partial<CustomerInfo>;
    contractor?: Partial<ContractorInfo>;
    job?: Partial<JobDetails>;
    lineItems?: LineItem[];
  };
}

export async function extractDataWithClaude(request: ExtractionRequest): Promise<ExtractionResponse> {
  try {
    const client = getAnthropicClient();
    const response = await retryWithBackoff(async () => {
      return await client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        temperature: 0,
        system: getSystemPrompt(),
        messages: [{
          role: 'user',
          content: getUserPrompt(request)
        }]
      });
    });

    // Parse Claude's response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new ExtractionError('Invalid response format from Claude');
    }

    try {
      const extracted = JSON.parse(content.text);
      return validateAndFormatResponse(extracted);
    } catch (error) {
      console.error('Failed to parse Claude response:', content.text);
      throw new ExtractionError('Failed to parse extraction results');
    }
  } catch (error) {
    if (error instanceof ExtractionError) {
      throw error;
    }
    
    console.error('Claude API error:', error);
    throw new NetworkError('Failed to connect to extraction service');
  }
}

function getSystemPrompt(): string {
  return `You are a specialized document processor for TCS Purchase Order Hub. Your task is to extract information from PDF text and output structured JSON data.

You will receive text from either:
1. Customer proposals (quotes/estimates for services)
2. Existing purchase orders (to be edited)

Your response must be valid JSON matching this exact structure:
{
  "documentType": "proposal" | "purchase_order",
  "confidence": 0.0-1.0,
  "extractedData": {
    "customer": {
      "companyName": string,
      "contactName": string,
      "email": string,
      "phone": string (format: "555-555-5555"),
      "jobLocation": string,
      "onsiteContactName": string,
      "onsiteContactPhone": string (format: "555-555-5555")
    },
    "contractor": {
      "companyName": string,
      "technicianName": string,
      "email": string,
      "phone": string (format: "555-555-5555")
    },
    "job": {
      "poNumber": string,
      "requestedServiceDate": string,
      "squareFootage": number,
      "floorType": string,
      "description": string,
      "additionalNotes": string
    },
    "lineItems": [
      {
        "description": string,
        "quantity": number,
        "unit": string,
        "unitPrice": number,
        "total": number
      }
    ]
  }
}

Important rules:
1. Set documentType based on document content (proposals have quotes/estimates, POs have purchase order numbers)
2. Set confidence based on how complete the extraction is (0.9+ for good extraction, 0.5-0.8 for partial, <0.5 for poor)
3. Extract all available fields, use empty strings or 0 for missing values
4. Format phone numbers as "555-555-5555"
5. Calculate line item totals (quantity * unitPrice)
6. For proposals, contractor info might be the company providing the quote
7. Include only fields that have actual data in the document`;
}

function getUserPrompt(request: ExtractionRequest): string {
  return `Extract information from this ${request.documentType || 'document'} text:

${request.text}

Return the extraction results as JSON following the exact structure specified in your instructions.`;
}

function validateAndFormatResponse(data: any): ExtractionResponse {
  // Ensure required fields exist
  if (!data.documentType || !data.extractedData) {
    throw new ExtractionError('Missing required fields in extraction response');
  }

  // Set default confidence if missing
  const confidence = typeof data.confidence === 'number' ? data.confidence : 0.5;

  // Format phone numbers
  if (data.extractedData.customer?.phone) {
    data.extractedData.customer.phone = formatPhoneNumber(data.extractedData.customer.phone);
  }
  if (data.extractedData.customer?.onsiteContactPhone) {
    data.extractedData.customer.onsiteContactPhone = formatPhoneNumber(data.extractedData.customer.onsiteContactPhone);
  }
  if (data.extractedData.contractor?.phone) {
    data.extractedData.contractor.phone = formatPhoneNumber(data.extractedData.contractor.phone);
  }

  // Ensure line items have calculated totals
  if (data.extractedData.lineItems) {
    data.extractedData.lineItems = data.extractedData.lineItems.map((item: any) => ({
      ...item,
      total: item.quantity * item.unitPrice
    }));
  }

  return {
    documentType: data.documentType,
    confidence,
    extractedData: data.extractedData
  };
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as 555-555-5555
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone; // Return original if can't format
}
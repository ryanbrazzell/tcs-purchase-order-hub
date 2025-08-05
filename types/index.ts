import { z } from 'zod';

// Customer Information Schema
export const CustomerInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format: 555-555-5555'),
  jobLocation: z.string().min(1, 'Job location is required'),
  onsiteContactName: z.string().min(1, 'Onsite contact name is required'),
  onsiteContactPhone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format: 555-555-5555')
});

// Contractor Information Schema
export const ContractorInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  technicianName: z.string().min(1, 'Technician name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{3}-\d{3}-\d{4}$/, 'Phone must be in format: 555-555-5555')
});

// Job Details Schema
export const JobDetailsSchema = z.object({
  poNumber: z.string().min(1, 'PO number is required'),
  requestedServiceDate: z.string().min(1, 'Service date is required'),
  squareFootage: z.number().positive('Square footage must be positive'),
  floorType: z.string().min(1, 'Floor type is required'),
  description: z.string().min(1, 'Job description is required'),
  additionalNotes: z.string().optional()
});

// Line Item Schema
export const LineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  total: z.number().nonnegative()
});

// Standard Terms Schema
export const StandardTermsSchema = z.object({
  paymentTerms: z.string(),
  photoRequirement: z.string(),
  signOffRequired: z.string(),
  workersCompNote: z.string()
});

// Complete Purchase Order Schema
export const PurchaseOrderSchema = z.object({
  id: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  customer: CustomerInfoSchema,
  contractor: ContractorInfoSchema,
  job: JobDetailsSchema,
  lineItems: z.array(LineItemSchema),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
  standardTerms: StandardTermsSchema
});

// TypeScript Types (inferred from Zod schemas)
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;
export type ContractorInfo = z.infer<typeof ContractorInfoSchema>;
export type JobDetails = z.infer<typeof JobDetailsSchema>;
export type LineItem = z.infer<typeof LineItemSchema>;
export type StandardTerms = z.infer<typeof StandardTermsSchema>;
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

// Extraction Result Types
export interface ExtractionResult {
  documentType: 'proposal' | 'purchase_order';
  confidence: number;
  extractedData: Partial<PurchaseOrder>;
  rawText: string;
}

// API Response Types
export interface ExtractPDFResponse {
  success: boolean;
  documentType?: 'proposal' | 'purchase_order';
  extractedData?: {
    customer?: Partial<CustomerInfo>;
    contractor?: Partial<ContractorInfo>;
    job?: Partial<JobDetails>;
    lineItems?: LineItem[];
  };
  errors?: string[];
}

export interface GeneratePDFResponse {
  success: boolean;
  error?: string;
}

// Form Field Types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea';
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

// Type Guards
export const isProposal = (doc: { documentType: string }): boolean => {
  return doc.documentType === 'proposal';
};

export const isPurchaseOrder = (doc: { documentType: string }): boolean => {
  return doc.documentType === 'purchase_order';
};

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type FormErrors<T> = {
  [K in keyof T]?: string;
};

// Constants
export const TAX_RATE = 0.0825; // 8.25%
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = ['application/pdf'];

// Default Values
export const defaultPurchaseOrder: PurchaseOrder = {
  customer: {
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    jobLocation: '',
    onsiteContactName: '',
    onsiteContactPhone: ''
  },
  contractor: {
    companyName: '',
    technicianName: '',
    email: '',
    phone: ''
  },
  job: {
    poNumber: '',
    requestedServiceDate: '',
    squareFootage: 0,
    floorType: '',
    description: '',
    additionalNotes: ''
  },
  lineItems: [],
  subtotal: 0,
  tax: 0,
  total: 0,
  standardTerms: {
    paymentTerms: 'Net 30 with customer funds',
    photoRequirement: '30 Before and After Pics required',
    signOffRequired: 'Sign off required by customer for payment',
    workersCompNote: 'All workers on jobsite to be referred to as "TCS employees"'
  }
};
'use client';

import { CheckCircle, AlertCircle, User, Building, Briefcase, FileText } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CustomerInfo, ContractorInfo, JobDetails, LineItem } from '@/types';

interface ExtractionPreviewProps {
  documentType: 'proposal' | 'purchase_order';
  confidence: number;
  extractedData: {
    customer?: Partial<CustomerInfo>;
    contractor?: Partial<ContractorInfo>;
    job?: Partial<JobDetails>;
    lineItems?: LineItem[];
  };
  onConfirm: () => void;
  onEdit: () => void;
  className?: string;
}

export function ExtractionPreview({
  documentType,
  confidence,
  extractedData,
  onConfirm,
  onEdit,
  className
}: ExtractionPreviewProps) {
  const getConfidenceColor = () => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-50';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getConfidenceText = () => {
    if (confidence >= 0.9) return 'High confidence';
    if (confidence >= 0.7) return 'Medium confidence';
    return 'Low confidence';
  };

  const hasValue = (value: any) => {
    return value !== undefined && value !== null && value !== '' && value !== 0;
  };

  const countExtractedFields = () => {
    let total = 0;
    let extracted = 0;

    // Count customer fields
    const customerFields = ['companyName', 'contactName', 'email', 'phone', 'jobLocation', 'onsiteContactName', 'onsiteContactPhone'];
    total += customerFields.length;
    if (extractedData.customer) {
      extracted += customerFields.filter(field => hasValue((extractedData.customer as any)[field])).length;
    }

    // Count contractor fields (if PO)
    if (documentType === 'purchase_order') {
      const contractorFields = ['companyName', 'technicianName', 'email', 'phone'];
      total += contractorFields.length;
      if (extractedData.contractor) {
        extracted += contractorFields.filter(field => hasValue((extractedData.contractor as any)[field])).length;
      }
    }

    // Count job fields
    const jobFields = ['description', 'squareFootage', 'floorType'];
    total += jobFields.length;
    if (extractedData.job) {
      extracted += jobFields.filter(field => hasValue((extractedData.job as any)[field])).length;
    }

    return { extracted, total };
  };

  const { extracted, total } = countExtractedFields();

  return (
    <div className={cn('bg-white rounded-lg border border-tcs-gray-200 p-6', className)}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-tcs-gray-900">
            Extraction Preview
          </h3>
          <div className={cn('px-3 py-1 rounded-full text-sm font-medium', getConfidenceColor())}>
            {getConfidenceText()}
          </div>
        </div>
        
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-tcs-gray-600">
            Document type: <span className="font-medium text-tcs-gray-900">
              {documentType === 'proposal' ? 'Customer Proposal' : 'Purchase Order'}
            </span>
          </span>
          <span className="text-tcs-gray-600">
            Fields extracted: <span className="font-medium text-tcs-gray-900">
              {extracted} of {total}
            </span>
          </span>
        </div>
      </div>

      {/* Extracted Data Sections */}
      <div className="space-y-6">
        {/* Customer Information */}
        {extractedData.customer && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <User className="w-4 h-4 text-tcs-blue-600" />
              <h4 className="font-medium text-tcs-gray-900">Customer Information</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(extractedData.customer).map(([key, value]) => (
                hasValue(value) && (
                  <div key={key} className="flex justify-between">
                    <span className="text-tcs-gray-600">{formatFieldName(key)}:</span>
                    <span className="font-medium text-tcs-gray-900">{value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Contractor Information */}
        {extractedData.contractor && Object.keys(extractedData.contractor).length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Building className="w-4 h-4 text-tcs-blue-600" />
              <h4 className="font-medium text-tcs-gray-900">Contractor Information</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(extractedData.contractor).map(([key, value]) => (
                hasValue(value) && (
                  <div key={key} className="flex justify-between">
                    <span className="text-tcs-gray-600">{formatFieldName(key)}:</span>
                    <span className="font-medium text-tcs-gray-900">{value}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Job Details */}
        {extractedData.job && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Briefcase className="w-4 h-4 text-tcs-blue-600" />
              <h4 className="font-medium text-tcs-gray-900">Job Details</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {Object.entries(extractedData.job).map(([key, value]) => (
                hasValue(value) && (
                  <div key={key} className="flex justify-between">
                    <span className="text-tcs-gray-600">{formatFieldName(key)}:</span>
                    <span className="font-medium text-tcs-gray-900">
                      {key === 'squareFootage' ? `${value} sq ft` : value}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Line Items */}
        {extractedData.lineItems && extractedData.lineItems.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="w-4 h-4 text-tcs-blue-600" />
              <h4 className="font-medium text-tcs-gray-900">Line Items ({extractedData.lineItems.length})</h4>
            </div>
            <div className="bg-tcs-gray-50 rounded-lg p-3 text-sm">
              {extractedData.lineItems.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between mb-1">
                  <span className="text-tcs-gray-700">{item.description}</span>
                  <span className="font-medium text-tcs-gray-900">${item.total.toFixed(2)}</span>
                </div>
              ))}
              {extractedData.lineItems.length > 3 && (
                <div className="text-tcs-gray-600 text-center mt-2">
                  ...and {extractedData.lineItems.length - 3} more items
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 pt-6 border-t border-tcs-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-tcs-gray-600">
            {confidence < 0.7 ? (
              <>
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span>Some fields may need manual review</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Extraction looks good</span>
              </>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 text-sm font-medium text-tcs-gray-700 bg-white border border-tcs-gray-300 rounded-lg hover:bg-tcs-gray-50 transition-colors"
            >
              Edit Details
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-tcs-blue-600 rounded-lg hover:bg-tcs-blue-700 transition-colors"
            >
              Use This Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFieldName(field: string): string {
  // Convert camelCase to Title Case
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
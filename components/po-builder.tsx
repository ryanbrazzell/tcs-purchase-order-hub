'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Loader2, Upload, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

type FieldKey = 
  | 'po_date' | 'po_number' | 'customer_first_name' | 'customer_last_name'
  | 'customer_company' | 'onsite_contact_name' | 'onsite_contact_phone'
  | 'customer_phone' | 'customer_email' | 'billing_address' | 'project_address'
  | 'city' | 'state' | 'zip' | 'service_type' | 'floor_type' | 'square_footage'
  | 'unit_price' | 'subtotal' | 'tax' | 'total' | 'timeline'
  | 'requested_service_date' | 'special_requirements' | 'doc_reference' | 'notes';

type POFields = Record<FieldKey, string>;

const fieldLabels: Record<FieldKey, string> = {
  po_date: 'PO Date',
  po_number: 'PO Number',
  customer_first_name: 'Customer First Name',
  customer_last_name: 'Customer Last Name',
  customer_company: 'Customer Company',
  onsite_contact_name: 'Onsite Contact Name',
  onsite_contact_phone: 'Onsite Contact Phone',
  customer_phone: 'Customer Phone',
  customer_email: 'Customer Email',
  billing_address: 'Billing Address',
  project_address: 'Project Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP Code',
  service_type: 'Service Type',
  floor_type: 'Floor Type',
  square_footage: 'Square Footage',
  unit_price: 'Unit Price (per sq ft)',
  subtotal: 'Subtotal',
  tax: 'Tax',
  total: 'Total',
  timeline: 'Timeline',
  requested_service_date: 'Requested Service Date',
  special_requirements: 'Special Requirements',
  doc_reference: 'Document Reference',
  notes: 'Notes'
};

const fieldGroups = {
  'PO Information': ['po_date', 'po_number', 'doc_reference'] as FieldKey[],
  'Customer Details': [
    'customer_first_name', 'customer_last_name', 'customer_company',
    'customer_phone', 'customer_email'
  ] as FieldKey[],
  'Addresses': ['billing_address', 'project_address', 'city', 'state', 'zip'] as FieldKey[],
  'Onsite Contact': ['onsite_contact_name', 'onsite_contact_phone'] as FieldKey[],
  'Service Information': [
    'service_type', 'floor_type', 'square_footage', 'timeline', 'requested_service_date'
  ] as FieldKey[],
  'Pricing': ['unit_price', 'subtotal', 'tax', 'total'] as FieldKey[],
  'Additional': ['special_requirements', 'notes'] as FieldKey[]
};

export function POBuilder() {
  const [fields, setFields] = useState<POFields | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/parse-proposal', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse PDF');
      }
      
      const data = await response.json();
      setFields(data);
      toast.success('PDF parsed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse PDF');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFieldChange = (key: FieldKey, value: string) => {
    setFields(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleGenerate = async () => {
    if (!fields) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchase-order-${fields.po_number || 'draft'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Purchase order generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          TCS Purchase Order Builder
        </h1>
        <p className="text-gray-600">
          Upload a proposal PDF to extract information and generate a purchase order
        </p>
      </div>

      {/* Upload Section */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1"
          />
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="min-w-[120px]"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Parse PDF
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Fields Editor */}
      {fields && (
        <>
          <div className="space-y-6">
            {Object.entries(fieldGroups).map(([groupName, groupFields]) => (
              <Card key={groupName} className="p-6">
                <h2 className="text-lg font-semibold mb-4">{groupName}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {groupFields.map((key) => (
                    <div key={key}>
                      <Label htmlFor={key} className="text-sm text-gray-600">
                        {fieldLabels[key]}
                      </Label>
                      <Input
                        id={key}
                        type={key.includes('date') ? 'date' : 'text'}
                        value={fields[key] || ''}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              size="lg"
              className="min-w-[200px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate PO PDF
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
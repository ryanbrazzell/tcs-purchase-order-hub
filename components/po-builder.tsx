'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Upload, Download, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { Logger } from '@/lib/logger';

const logger = new Logger('po-builder');

type FieldKey = 
  | 'po_date' | 'po_number' | 'customer_first_name' | 'customer_last_name'
  | 'customer_company' | 'onsite_contact_name' | 'onsite_contact_phone'
  | 'customer_phone' | 'customer_email' | 'billing_address' | 'project_address'
  | 'city' | 'state' | 'zip' | 'service_type' | 'service_description' | 'floor_type' | 'square_footage'
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
  service_description: 'Service Description',
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
    'service_type', 'service_description', 'floor_type', 'square_footage', 'timeline', 'requested_service_date'
  ] as FieldKey[],
  'Pricing': ['unit_price', 'subtotal', 'tax', 'total'] as FieldKey[],
  'Additional': ['special_requirements', 'notes'] as FieldKey[]
};

const DRAFT_STORAGE_KEY = 'tcs-po-draft';

export function POBuilder() {
  const [fields, setFields] = useState<POFields | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Load draft on component mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        setFields(draft);
        toast.success('Draft loaded from previous session');
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, []);
  
  // Debounced save draft
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (fields) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for debounced save (500ms delay)
      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(fields));
          logger.info('Draft saved to localStorage');
        } catch (error) {
          console.error('Failed to save draft:', error);
        }
      }, 500);
    }
    
    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [fields]);

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    try {
      logger.info('Starting file upload', { name: file.name, size: file.size, type: file.type });
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Use the OpenAI file upload endpoint
      const response = await fetch('/api/parse-proposal-openai', {
        method: 'POST',
        body: formData
      });
      
      logger.info('Response received', { status: response.status });
      
      // Read response as text first to debug
      const text = await response.text();
      logger.info('Raw response', { text });
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
          try {
            data = JSON.parse(codeBlockMatch[1]);
            logger.info('Successfully extracted JSON from markdown code block');
          } catch (secondParseError) {
            logger.error('Failed to parse JSON from code block', { text, error: secondParseError });
            throw new Error('Invalid response format from server - could not parse JSON');
          }
        } else {
          // Try one more time to find any JSON object in the text
          const jsonMatch = text.match(/(\{[\s\S]*\})/);
          if (jsonMatch) {
            try {
              data = JSON.parse(jsonMatch[1]);
              logger.info('Successfully extracted JSON from text');
            } catch (thirdParseError) {
              logger.error('Failed to parse extracted JSON', { text, error: thirdParseError });
              throw new Error('Invalid response format from server - malformed JSON');
            }
          } else {
            logger.error('No JSON found in response', { text });
            throw new Error('Invalid response format from server - no JSON detected');
          }
        }
      }
      
      if (!response.ok) {
        logger.error('Error response from server', { data });
        
        // Show debug info if available
        if (data.debug) {
          console.error('=== DEBUG INFO ===');
          console.error(JSON.stringify(data.debug, null, 2));
          console.error('==================');
        }
        
        throw new Error(data.error || 'Failed to parse PDF');
      }
      
      logger.info('Successfully parsed data', { data });
      setFields(data);
      toast.success('PDF parsed successfully!');
    } catch (error: any) {
      logger.error('Upload error', { 
        message: error.message,
        stack: error.stack
      });
      
      // Report error to server
      try {
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: 'po-builder-client',
            error: {
              message: error.message,
              stack: error.stack
            },
            context: {
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type
            }
          })
        });
      } catch (e) {
        // Ignore error reporting failures
      }
      
      toast.error(error.message || 'Failed to parse PDF');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFieldChange = (key: FieldKey, value: string) => {
    setFields(prev => prev ? { ...prev, [key]: value } : null);
  };
  
  const clearDraft = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all fields?')) {
      setFields(null);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      toast.success('Draft cleared');
    }
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-in">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Purchase Order Builder
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload a proposal PDF to extract information and generate a professional purchase order
          </p>
        </div>

        {/* Upload Section */}
        <Card className="p-8 border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
          <div className="space-y-6">
            {!fields && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Get Started</h3>
                <p className="text-muted-foreground">
                  Upload a PDF proposal to automatically extract data and create your purchase order
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label htmlFor="file-upload" className="block">
                  <div className="border-2 border-dashed border-input rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <input
                      id="file-upload"
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="sr-only"
                    />
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">
                      {file ? file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF files only
                    </p>
                  </div>
                </label>
              </div>
              <Button
                onClick={handleUpload}
                disabled={!file || isUploading}
                size="lg"
                className="min-w-[140px] shadow-md"
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
          </div>
        </Card>

        {/* Fields Editor */}
        {fields && (
          <div className="space-y-6 animate-in">
            {/* Draft Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <p className="text-sm text-muted-foreground">
                  Draft auto-saved • Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
              <Button
                onClick={clearDraft}
                variant="outline"
                size="sm"
                className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
              >
                Clear Draft
              </Button>
            </div>
          
            {/* Field Groups */}
            <div className="space-y-6">
              {Object.entries(fieldGroups).map(([groupName, groupFields]) => (
                <Card key={groupName} className="p-6 shadow-sm hover:shadow-md transition-shadow border-0">
                  <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    {groupName}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {groupFields.map((key) => {
                    const isLargeField = ['service_description', 'special_requirements', 'notes'].includes(key);
                    const isFullWidth = isLargeField || key === 'billing_address' || key === 'project_address';
                    
                      return (
                        <div key={key} className={`space-y-2 ${isFullWidth ? 'md:col-span-2' : ''}`}>
                          <Label htmlFor={key} className="text-sm font-medium">
                            {fieldLabels[key]}
                          </Label>
                          {isLargeField ? (
                            <Textarea
                              id={key}
                              value={fields[key] || ''}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                              className="min-h-[100px] text-sm"
                              placeholder={key === 'service_description' ? 'Describe the service in detail...' : ''}
                            />
                          ) : (
                            <Input
                              id={key}
                              type={key.includes('date') ? 'date' : 'text'}
                              value={fields[key] || ''}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                              className="text-sm"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>

            {/* Generate Button */}
            <div className="flex justify-center py-8">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="lg"
                className="min-w-[220px] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Generate Purchase Order
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Loader2, Upload, Download, FileText, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import { Logger } from '@/lib/logger';
import { ExtractionProgress } from './extraction-progress';
import { VoiceRecorderCompact } from './voice-recorder-compact';

const logger = new Logger('po-builder');

type FieldKey = 
  | 'po_date' | 'po_number' | 'customer_first_name' | 'customer_last_name'
  | 'customer_company' | 'onsite_contact_name' | 'onsite_contact_phone'
  | 'customer_phone' | 'project_address'
  | 'city' | 'state' | 'zip' | 'service_type' | 'service_description' | 'floor_type' | 'square_footage'
  | 'timeline' | 'requested_service_date' | 'special_requirements' | 'doc_reference' | 'notes'
  | 'subcontractor_company' | 'subcontractor_contact' | 'subcontractor_phone' | 'subcontractor_email'
  | 'subcontractor_address' | 'subcontractor_city' | 'subcontractor_state' | 'subcontractor_zip'
  | 'line_item_1_desc' | 'line_item_1_price' | 'line_item_2_desc' | 'line_item_2_price'
  | 'line_item_3_desc' | 'line_item_3_price' | 'line_item_4_desc' | 'line_item_4_price'
  | 'line_item_5_desc' | 'line_item_5_price' | 'total';

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
  project_address: 'Job Site Address',
  city: 'City',
  state: 'State',
  zip: 'ZIP Code',
  service_type: 'Service Type',
  service_description: 'Service Description',
  floor_type: 'Floor Type',
  square_footage: 'Square Footage',
  timeline: 'Timeline',
  requested_service_date: 'Requested Service Date',
  special_requirements: 'Special Requirements',
  doc_reference: 'Document Reference',
  notes: 'Notes',
  subcontractor_company: 'Subcontractor Company Name',
  subcontractor_contact: 'Subcontractor Contact Name',
  subcontractor_phone: 'Subcontractor Phone',
  subcontractor_email: 'Subcontractor Email',
  subcontractor_address: 'Subcontractor Address',
  subcontractor_city: 'Subcontractor City',
  subcontractor_state: 'Subcontractor State',
  subcontractor_zip: 'Subcontractor ZIP',
  line_item_1_desc: 'Line Item 1 Description',
  line_item_1_price: 'Line Item 1 Price',
  line_item_2_desc: 'Line Item 2 Description',
  line_item_2_price: 'Line Item 2 Price',
  line_item_3_desc: 'Line Item 3 Description',
  line_item_3_price: 'Line Item 3 Price',
  line_item_4_desc: 'Line Item 4 Description',
  line_item_4_price: 'Line Item 4 Price',
  line_item_5_desc: 'Line Item 5 Description',
  line_item_5_price: 'Line Item 5 Price',
  total: 'Total'
};

const fieldGroups = {
  'PO Information': ['po_date', 'po_number', 'doc_reference'] as FieldKey[],
  'Subcontractor Information': [
    'subcontractor_company', 'subcontractor_contact', 'subcontractor_phone', 'subcontractor_email',
    'subcontractor_address', 'subcontractor_city', 'subcontractor_state', 'subcontractor_zip'
  ] as FieldKey[],
  'Customer Details': [
    'customer_first_name', 'customer_last_name', 'customer_company',
    'customer_phone'
  ] as FieldKey[],
  'Job Site Location': ['project_address', 'city', 'state', 'zip'] as FieldKey[],
  'Onsite Contact': ['onsite_contact_name', 'onsite_contact_phone'] as FieldKey[],
  'Service Information': [
    'service_type', 'service_description', 'floor_type', 'square_footage', 'timeline', 'requested_service_date'
  ] as FieldKey[],
  'Sub Contractor Pricing': [
    'line_item_1_desc', 'line_item_1_price',
    'line_item_2_desc', 'line_item_2_price',
    'line_item_3_desc', 'line_item_3_price',
    'line_item_4_desc', 'line_item_4_price',
    'line_item_5_desc', 'line_item_5_price',
    'total'
  ] as FieldKey[],
  'Additional': ['special_requirements', 'notes'] as FieldKey[]
};

const DRAFT_STORAGE_KEY = 'tcs-po-draft';

export function POBuilder() {
  const [fields, setFields] = useState<POFields | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [extractionCompleted, setExtractionCompleted] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);
  
  // Stable callback for progress completion
  const handleProgressComplete = useCallback(() => {
    setShowProgress(false);
    setExtractionCompleted(false); // Reset for next extraction
    if (fields) {
      toast.success('Data extracted successfully! Review the extracted data below.');
    }
  }, [fields]);

  // Handle voice recording completion
  const handleVoiceRecorded = useCallback((blob: Blob) => {
    setVoiceBlob(blob);
    setHasVoiceNote(true);
    toast.success('Voice note recorded! Ready to extract with PDF.');
  }, []);

  // Handle voice deletion
  const handleVoiceDeleted = useCallback(() => {
    setVoiceBlob(null);
    setHasVoiceNote(false);
    toast.success('Voice note removed.');
  }, []);
  
  // Calculate total from line items
  const calculateTotal = useCallback(() => {
    if (!fields) return '0.00';
    let total = 0;
    for (let i = 1; i <= 5; i++) {
      const priceKey = `line_item_${i}_price` as FieldKey;
      const price = parseFloat(String(fields[priceKey] || '0').replace(/[$,]/g, ''));
      if (!isNaN(price)) {
        total += price;
      }
    }
    return total.toFixed(2);
  }, [fields]);
  
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

  const handleExtractData = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setShowProgress(true);
    setExtractionCompleted(false); // Reset completion state
    try {
      logger.info('Starting file upload', { name: file.name, size: file.size, type: file.type });
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Add voice note if present
      if (voiceBlob) {
        formData.append('voice', voiceBlob, 'voice-note.webm');
        logger.info('Including voice note in extraction', { voiceSize: voiceBlob.size });
      }

      // Use the combined extraction endpoint
      const response = await fetch('/api/parse-proposal-combined', {
        method: 'POST',
        body: formData
      });
      
      logger.info('Response received', { status: response.status });
      
      // Read response as text first to debug
      const text = await response.text();
      logger.info('Raw response', { text, status: response.status, statusText: response.statusText });
      
      // Check for HTML response (common with server errors/timeouts)
      if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
        logger.error('Received HTML instead of JSON', { status: response.status });
        
        if (response.status === 504) {
          throw new Error('Server timed out processing the PDF. Please try a smaller file or one with selectable text.');
        }
        if (response.status === 413) {
          throw new Error('File too large. Please try a smaller PDF (under 10MB).');
        }
        if (response.status === 500) {
          throw new Error('Server encountered an error. Please try again later.');
        }
        
        throw new Error(`Server returned an invalid response (${response.status} ${response.statusText}).`);
      }
      
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
        logger.error('Error response from server', { 
          status: response.status,
          statusText: response.statusText,
          data 
        });
        
        // Show enhanced debug info if available
        if (data.debugInfo) {
          console.error('=== ENHANCED DEBUG INFO ===');
          console.error(JSON.stringify(data.debugInfo, null, 2));
          if (data.details) {
            console.error('Error Details:', data.details);
          }
          console.error('========================');
        }
        
        // Provide more specific error messages based on status code
        let errorMessage = data.error || 'Failed to parse PDF';
        if (data.details) {
          errorMessage = `${errorMessage}: ${data.details}`;
        }
        
        // Handle specific error cases
        if (response.status === 413) {
          errorMessage = 'File too large. Please try with a smaller PDF.';
        } else if (response.status === 429) {
          errorMessage = 'Service is busy. Please wait a moment and try again.';
        } else if (response.status === 408) {
          errorMessage = 'Processing timeout. Please try with a smaller or simpler PDF.';
        }
        
        throw new Error(errorMessage);
      }
      
      // Remove debug info from the fields before setting
      const { _debug, ...cleanData } = data;
      
      // Validate that we have a proper fields object
      if (!cleanData || typeof cleanData !== 'object' || Object.keys(cleanData).length === 0) {
        logger.error('Invalid fields data received', { cleanData });
        throw new Error('Invalid data received from server - no fields found');
      }
      
      logger.info('Successfully parsed data', { 
        fieldsCount: Object.keys(cleanData).length,
        debugInfo: _debug,
        hasVoiceProcessing: _debug?.processing?.voiceProcessed
      });
      
      setFields(cleanData as POFields);
      
      // Signal that extraction is complete
      setExtractionCompleted(true);
      
      // Note: Success message will be shown by handleProgressComplete
    } catch (error: any) {
      logger.error('Upload error', { 
        message: error.message,
        stack: error.stack
      });
      
      // Report error to server with enhanced context
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
              fileType: file.type,
              hasVoiceFile: !!voiceBlob,
              voiceFileSize: voiceBlob?.size,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (e) {
        logger.warn('Failed to report error to server', e);
      }
      
      toast.error(error.message || 'Failed to parse PDF');
      
      // Signal completion even on error so progress modal closes
      setExtractionCompleted(true);
    } finally {
      setIsUploading(false);
      // Don't hide progress here - let the completion handler do it
      // setShowProgress(false); // Removed
    }
  };

  const handleFieldChange = (key: FieldKey, value: string) => {
    setFields(prev => {
      if (!prev) return null;
      const updated = { ...prev, [key]: value };
      
      // Auto-calculate total when any line item price changes
      if (key.includes('line_item_') && key.includes('_price')) {
        let total = 0;
        for (let i = 1; i <= 5; i++) {
          const priceKey = `line_item_${i}_price` as FieldKey;
          const price = parseFloat(String(updated[priceKey] || '0').replace(/[$,]/g, ''));
          if (!isNaN(price)) {
            total += price;
          }
        }
        updated.total = total.toFixed(2);
      }
      
      return updated;
    });
  };
  
  const clearDraft = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all fields?')) {
      setFields(null);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      toast.success('Draft cleared');
    }
  }, []);

  const handleGenerate = async () => {
    if (!fields) {
      toast.error('Please extract data from a PDF first before generating a purchase order.');
      return;
    }
    
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


        {/* Combined Upload Section */}
        <Card className="p-8 border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
          <div className="space-y-6">
            {!fields && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Extract Job Data</h3>
                <p className="text-muted-foreground">
                  Upload a PDF proposal (required) and optionally add a voice note for maximum context
                </p>
              </div>
            )}
            
            {/* PDF Upload */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  PDF Proposal (Required)
                </label>
                <label htmlFor="file-upload" className="block">
                  <div className="border-2 border-dashed border-input rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors">
                    <input
                      id="file-upload"
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const newFile = e.target.files?.[0] || null;
                        setFile(newFile);
                        // Clear old fields when a new file is selected
                        if (newFile) {
                          setFields(null);
                          setExtractionCompleted(false);
                          setShowProgress(false);
                        }
                      }}
                      className="sr-only"
                    />
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">
                      {file ? file.name : 'Click to select PDF file'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF files only • Required for extraction
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Optional Voice Note Section */}
        <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground block">
                  Voice Note (Optional)
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  Add voice details for better context and more complete extraction
                </p>
              </div>
              {hasVoiceNote && (
                <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <Mic className="w-4 h-4 mr-1" />
                  Voice note ready
                </div>
              )}
            </div>
            
            <VoiceRecorderCompact
              onRecordingComplete={handleVoiceRecorded}
              onRecordingDeleted={handleVoiceDeleted}
              isUploading={isUploading}
            />
          </div>
        </Card>
        
        {/* Single Extract Button */}
        <div className="flex justify-center py-6">
          <Button
            onClick={handleExtractData}
            disabled={!file || isUploading}
            size="lg"
            className="min-w-[200px] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Extracting Data...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Extract Data
                {hasVoiceNote && (
                  <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    PDF + Voice
                  </span>
                )}
              </>
            )}
          </Button>
        </div>

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
                    const isFullWidth = isLargeField || key === 'project_address' || key === 'subcontractor_address' || key === 'total';
                    const isLineItemDesc = key.includes('line_item_') && key.includes('_desc');
                    const isPrice = key.includes('_price') || key === 'total';
                    
                      return (
                        <div key={key} className={`space-y-2 ${isFullWidth ? 'md:col-span-2' : ''} ${isLineItemDesc ? 'md:col-span-2 lg:col-span-1' : ''}`}>
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
                          ) : key === 'total' ? (
                            <Input
                              id={key}
                              type="text"
                              value={`$${calculateTotal()}`}
                              disabled
                              className="text-sm font-bold bg-muted"
                            />
                          ) : (
                            <Input
                              id={key}
                              type={key.includes('date') ? 'date' : isPrice ? 'text' : 'text'}
                              value={fields[key] || ''}
                              onChange={(e) => handleFieldChange(key, e.target.value)}
                              className="text-sm"
                              placeholder={isPrice ? '$0.00' : ''}
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

      {/* Extraction Progress Modal */}
      <ExtractionProgress
        isVisible={showProgress}
        isCompleted={extractionCompleted}
        onComplete={handleProgressComplete}
      />
    </div>
  );
}
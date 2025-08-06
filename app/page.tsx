'use client';

import { useState } from 'react';
import { PDFUpload } from '@/components/pdf-upload';
import { ExtractionPreview } from '@/components/extraction-preview';
import { PurchaseOrderForm } from '@/components/purchase-order-form';
import { ExtractPDFResponse } from '@/types';
import { extractPDFInBrowser } from '@/lib/pdf-client-extractor';
import toast from 'react-hot-toast';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'preview' | 'form'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractPDFResponse | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    
    try {
      // First, try client-side extraction
      console.log('Attempting client-side PDF extraction...');
      let extractedText = '';
      
      try {
        const clientExtraction = await extractPDFInBrowser(file);
        extractedText = clientExtraction.text;
        console.log('Client-side extraction successful, text length:', extractedText.length);
      } catch (clientError) {
        console.error('Client-side extraction failed:', clientError);
        toast.error('Could not read PDF in browser, trying server...');
      }
      
      // If we have text, send it to the API for Claude processing
      if (extractedText && extractedText.length > 50) {
        const response = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: extractedText,
            fileName: file.name
          }),
        });

        const data: ExtractPDFResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.errors?.[0] || 'Failed to process PDF text');
        }

        setExtractionResult(data);
        setStep('preview');
        toast.success('PDF extracted successfully!');
      } else {
        // Fallback to original server-side extraction
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/extract-pdf', {
          method: 'POST',
          body: formData,
        });

        const data: ExtractPDFResponse = await response.json();

        if (!response.ok || !data.success) {
          console.error('Server extraction failed:', {
            status: response.status,
            statusText: response.statusText,
            data
          });
          throw new Error(data.errors?.[0] || 'Failed to extract PDF');
        }

        setExtractionResult(data);
        setStep('preview');
        toast.success('PDF extracted successfully!');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to extract PDF');
      // Allow user to proceed with manual entry
      setStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmExtraction = () => {
    setStep('form');
  };

  const handleEditExtraction = () => {
    setStep('form');
  };

  const handleStartOver = () => {
    setStep('upload');
    setExtractionResult(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-tcs-gray-900 mb-2">
          Create Purchase Order
        </h1>
        <p className="text-tcs-gray-600">
          Upload a customer proposal to automatically extract information, or start with a blank form.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          <div className={`flex items-center ${step !== 'upload' ? 'text-tcs-blue-600' : 'text-tcs-gray-900'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step !== 'upload' ? 'bg-tcs-blue-600 text-white' : 'bg-tcs-gray-200'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Upload PDF</span>
          </div>
          
          <div className="mx-4 flex-1 h-px bg-tcs-gray-200" />
          
          <div className={`flex items-center ${step === 'form' ? 'text-tcs-blue-600' : step === 'preview' ? 'text-tcs-gray-900' : 'text-tcs-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step === 'form' ? 'bg-tcs-blue-600 text-white' : step === 'preview' ? 'bg-tcs-gray-200' : 'bg-tcs-gray-100'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Review Extraction</span>
          </div>
          
          <div className="mx-4 flex-1 h-px bg-tcs-gray-200" />
          
          <div className={`flex items-center ${step === 'form' ? 'text-tcs-blue-600' : 'text-tcs-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step === 'form' ? 'bg-tcs-blue-600 text-white' : 'bg-tcs-gray-100'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Complete Form</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm">
        {step === 'upload' && (
          <div className="p-8">
            <PDFUpload 
              onFileSelect={handleFileSelect}
              isLoading={isLoading}
              className="mb-6"
            />
            
            <div className="text-center">
              <p className="text-sm text-tcs-gray-600 mb-4">or</p>
              <button
                onClick={() => setStep('form')}
                className="text-tcs-blue-600 hover:text-tcs-blue-700 font-medium"
              >
                Start with a blank form →
              </button>
            </div>
          </div>
        )}

        {step === 'preview' && extractionResult && (
          <div className="p-8">
            <ExtractionPreview
              documentType={extractionResult.documentType!}
              confidence={0.85} // You might want to add this to the API response
              extractedData={extractionResult.extractedData!}
              onConfirm={handleConfirmExtraction}
              onEdit={handleEditExtraction}
            />
          </div>
        )}

        {step === 'form' && (
          <div className="p-8">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-tcs-gray-900">
                Purchase Order Details
              </h2>
              <button
                onClick={handleStartOver}
                className="text-sm text-tcs-gray-600 hover:text-tcs-gray-900"
              >
                ← Start Over
              </button>
            </div>
            
            <PurchaseOrderForm
              initialData={extractionResult?.extractedData as any}
            />
          </div>
        )}
      </div>
    </div>
  );
}
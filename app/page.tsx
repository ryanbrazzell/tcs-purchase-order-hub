'use client';

import { useState } from 'react';
import { PDFUpload } from '@/components/pdf-upload';
import { ExtractionPreview } from '@/components/extraction-preview';
import { TextPreview } from '@/components/text-preview';
import { PurchaseOrderForm } from '@/components/purchase-order-form';
import { ExtractPDFResponse } from '@/types';
import { convertPDFToImages } from '@/lib/pdf-to-images';
import toast from 'react-hot-toast';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'text' | 'preview' | 'form'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'uploading' | 'extracting' | 'processing' | 'complete'>('uploading');
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractionResult, setExtractionResult] = useState<ExtractPDFResponse | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setLoadingStage('uploading');
    
    try {
      // Convert PDF to images in the browser
      console.log('Converting PDF to images...');
      setLoadingStage('extracting');
      const images = await convertPDFToImages(file);
      console.log(`Converted ${images.length} pages to images`);
      
      // Update stage after conversion
      setLoadingStage('processing');

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Send images to OpenAI
      const response = await fetch('/api/extract-text-only', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
      
      // Already set to processing above

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('Extraction failed:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.errors?.[0] || 'Failed to extract PDF');
      }
      
      // Final stage
      setLoadingStage('complete');
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      setExtractedText(data.extractedText);
      setStep('text');
      toast.success('Text extracted successfully!');
    } catch (error) {
      console.error('Extraction error:', error);
      
      let errorMessage = 'Failed to extract PDF';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      // Allow user to proceed with manual entry
      setStep('form');
    } finally {
      setIsLoading(false);
      setLoadingStage('uploading'); // Reset for next time
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
    setExtractedText('');
    setExtractionResult(null);
  };

  const handleTextContinue = async () => {
    setIsLoading(true);
    try {
      // Now structure the text
      const response = await fetch('/api/structure-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: extractedText })
      });

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.errors?.[0] || 'Failed to structure text');
      }

      setExtractionResult(data);
      setStep('preview');
      toast.success('Data structured successfully!');
    } catch (error) {
      console.error('Structure error:', error);
      toast.error('Failed to structure text. Proceeding to manual entry.');
      setStep('form');
    } finally {
      setIsLoading(false);
    }
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
          
          <div className={`flex items-center ${['text', 'preview', 'form'].includes(step) ? 'text-tcs-blue-600' : 'text-tcs-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              ['text', 'preview', 'form'].includes(step) ? 'bg-tcs-blue-600 text-white' : 'bg-tcs-gray-100'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">View Text</span>
          </div>
          
          <div className="mx-4 flex-1 h-px bg-tcs-gray-200" />
          
          <div className={`flex items-center ${step === 'form' ? 'text-tcs-blue-600' : step === 'preview' ? 'text-tcs-gray-900' : 'text-tcs-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step === 'form' ? 'bg-tcs-blue-600 text-white' : step === 'preview' ? 'bg-tcs-gray-200' : 'bg-tcs-gray-100'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Review Data</span>
          </div>
          
          <div className="mx-4 flex-1 h-px bg-tcs-gray-200" />
          
          <div className={`flex items-center ${step === 'form' ? 'text-tcs-blue-600' : 'text-tcs-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step === 'form' ? 'bg-tcs-blue-600 text-white' : 'bg-tcs-gray-100'
            }`}>
              4
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
              loadingStage={loadingStage}
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

        {step === 'text' && (
          <div className="p-8">
            <TextPreview
              extractedText={extractedText}
              characterCount={extractedText.length}
              onContinue={handleTextContinue}
              onBack={handleStartOver}
            />
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
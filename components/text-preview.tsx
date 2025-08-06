'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, ArrowRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface TextPreviewProps {
  extractedText: string;
  characterCount: number;
  onContinue: () => void;
  onBack: () => void;
}

export function TextPreview({ extractedText, characterCount, onContinue, onBack }: TextPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      toast.success('Text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-tcs-gray-900">Extracted Text Preview</h2>
          <p className="text-sm text-tcs-gray-600 mt-1">
            {characterCount.toLocaleString()} characters extracted from the PDF
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Text
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-8 h-8 text-tcs-blue-600" />
          <div>
            <h3 className="font-medium text-tcs-gray-900">Raw Extracted Text</h3>
            <p className="text-sm text-tcs-gray-600">
              This is what OpenAI Vision extracted from your PDF
            </p>
          </div>
        </div>

        <ScrollArea className="h-[400px] w-full rounded-md border bg-gray-50 p-4">
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {extractedText || 'No text extracted'}
          </pre>
        </ScrollArea>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
        >
          ← Upload Different PDF
        </Button>
        
        <Button
          onClick={onContinue}
          className="flex items-center gap-2"
        >
          Continue to Structure Data
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TestSimplePage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const testPDF = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/simple-pdf-test', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Simple PDF Test - Compare Methods</h1>
      
      <Card className="p-6 mb-4">
        <p className="mb-4">This test will try different methods to read your PDF and show what works:</p>
        <ul className="list-disc ml-6 space-y-2 text-sm">
          <li>pdf-parse library extraction</li>
          <li>Send extracted text to OpenAI for summary</li>
          <li>Try Vision API (will likely fail for PDFs)</li>
        </ul>
      </Card>

      <div className="space-y-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        <Button 
          onClick={testPDF} 
          disabled={!file || loading}
          className="w-full"
        >
          {loading ? 'Testing PDF...' : 'Test PDF Reading Methods'}
        </Button>
      </div>
      
      {result && (
        <Card className="mt-6 p-6">
          <h2 className="font-bold mb-4">Results:</h2>
          
          {result.openAISummary && (
            <div className="mb-6 p-4 bg-green-50 rounded">
              <h3 className="font-semibold text-green-800 mb-2">✅ OpenAI Summary:</h3>
              <p className="text-sm">{result.openAISummary}</p>
            </div>
          )}
          
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
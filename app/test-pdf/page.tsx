'use client';

import { useState } from 'react';

export default function TestPDFPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/test-pdf', {
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
      <h1 className="text-2xl font-bold mb-4">PDF Analysis Tool</h1>
      
      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="mb-4"
      />
      
      {loading && <p>Analyzing PDF...</p>}
      
      {result && (
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
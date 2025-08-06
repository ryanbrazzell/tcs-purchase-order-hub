// Client-side PDF extraction using PDF.js
import { PDFExtractionResult } from './pdf-extractor';

// Declare global for PDF.js
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export async function extractPDFInBrowser(file: File): Promise<PDFExtractionResult> {
  // Dynamically load PDF.js from CDN
  if (!window.pdfjsLib) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);
    
    await new Promise((resolve) => {
      script.onload = resolve;
    });
  }
  
  const pdfjsLib = window.pdfjsLib;
  
  // Use CDN for worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  // Extract text from each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  return {
    text: fullText,
    numPages: pdf.numPages,
    info: {}
  };
}
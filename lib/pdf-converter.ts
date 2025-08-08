export async function convertPDFToImages(file: File): Promise<string[]> {
  // We'll use PDF.js library from CDN
  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error('PDF.js library not loaded');
  }
  
  // Set worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];
  
  console.log(`Converting ${pdf.numPages} PDF pages to images...`);
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Convert to data URL
    const imageDataUrl = canvas.toDataURL('image/png');
    images.push(imageDataUrl);
    
    console.log(`Converted page ${i}/${pdf.numPages}`);
  }
  
  return images;
}
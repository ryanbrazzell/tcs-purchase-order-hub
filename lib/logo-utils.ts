/**
 * Utility functions for handling TCS Floors logo in PDFs
 */

import fs from 'fs';
import path from 'path';

/**
 * Extract base64 PNG data from TCS logo SVG file
 */
export function getTCSLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'tcs-logo.svg');
    const svgContent = fs.readFileSync(logoPath, 'utf-8');
    
    // Extract base64 PNG data from SVG
    const base64Match = svgContent.match(/data:image\/png;base64,([^"]+)/);
    if (base64Match && base64Match[1]) {
      return base64Match[1];
    }
    
    return null;
  } catch (error) {
    console.error('Failed to extract logo base64:', error);
    return null;
  }
}

/**
 * Get TCS logo as data URI for use in jsPDF
 */
export function getTCSLogoDataURI(): string | null {
  const base64Data = getTCSLogoBase64();
  if (base64Data) {
    return `data:image/png;base64,${base64Data}`;
  }
  return null;
}
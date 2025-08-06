import { ExtractionError } from './errors';

// Very simple PDF text extraction for edge runtime
export async function extractTextSimple(buffer: Buffer): Promise<string> {
  try {
    // Convert buffer to string
    const content = buffer.toString('binary');
    
    // Extract visible text using multiple methods
    let extractedText = '';
    
    // Method 1: Look for text between parentheses followed by Tj
    const tjMatches = content.match(/\((.*?)\)\s*Tj/g);
    if (tjMatches) {
      for (const match of tjMatches) {
        const text = match.match(/\((.*?)\)/);
        if (text && text[1]) {
          extractedText += text[1] + ' ';
        }
      }
    }
    
    // Method 2: Look for BT...ET blocks
    const btMatches = content.match(/BT[\s\S]*?ET/g);
    if (btMatches) {
      for (const block of btMatches) {
        const texts = block.match(/\((.*?)\)/g);
        if (texts) {
          for (const t of texts) {
            const clean = t.slice(1, -1);
            if (clean && clean.length > 0) {
              extractedText += clean + ' ';
            }
          }
        }
      }
    }
    
    // Clean up
    extractedText = extractedText
      .replace(/\\(\d{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)))
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If we got some text, return it
    if (extractedText.length > 100) {
      return extractedText;
    }
    
    // Fallback: Just extract any readable ASCII text
    const readable = content.match(/[\x20-\x7E]{10,}/g);
    if (readable) {
      extractedText = readable
        .filter(s => !s.includes('<<') && !s.includes('>>') && !s.includes('obj'))
        .join(' ');
    }
    
    return extractedText || '';
  } catch (error) {
    console.error('Simple extraction error:', error);
    return '';
  }
}
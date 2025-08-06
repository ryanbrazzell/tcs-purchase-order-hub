// Edge-compatible PDF text extraction
export async function extractPDFTextEdge(buffer: Buffer): Promise<string> {
  const content = buffer.toString('binary');
  const texts: string[] = [];
  
  // Method 1: Extract text from stream objects
  const streamPattern = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match;
  
  while ((match = streamPattern.exec(content)) !== null) {
    const streamData = match[1];
    
    // Try to decode the stream
    if (streamData.includes('Tj') || streamData.includes('TJ')) {
      // Extract text from Tj/TJ operators
      const tjPattern = /\(((?:[^()\\]|\\[\\()ntrbf]|\\[0-7]{1,3})*)\)\s*Tj/g;
      const tjArrayPattern = /\[((?:[^\[\]]+|\[[^\[\]]*\])*)\]\s*TJ/g;
      
      let textMatch;
      while ((textMatch = tjPattern.exec(streamData)) !== null) {
        const text = decodeText(textMatch[1]);
        if (text) texts.push(text);
      }
      
      while ((textMatch = tjArrayPattern.exec(streamData)) !== null) {
        const arrayContent = textMatch[1];
        const stringPattern = /\(((?:[^()\\]|\\[\\()ntrbf]|\\[0-7]{1,3})*)\)/g;
        let stringMatch;
        while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
          const text = decodeText(stringMatch[1]);
          if (text) texts.push(text);
        }
      }
    }
  }
  
  // Method 2: Look for text in BT...ET blocks
  const btPattern = /BT([\s\S]*?)ET/g;
  while ((match = btPattern.exec(content)) !== null) {
    const blockContent = match[1];
    const textPattern = /\(((?:[^()\\]|\\[\\()ntrbf]|\\[0-7]{1,3})*)\)/g;
    let textMatch;
    while ((textMatch = textPattern.exec(blockContent)) !== null) {
      const text = decodeText(textMatch[1]);
      if (text) texts.push(text);
    }
  }
  
  // Method 3: Direct text object extraction
  const objPattern = /obj[\s\r\n]*<<([^>]*)>>[\s\r\n]*stream([\s\S]*?)endstream/g;
  while ((match = objPattern.exec(content)) !== null) {
    const streamContent = match[2];
    if (streamContent.length < 100000) { // Skip very large streams
      const readable = extractReadableText(streamContent);
      if (readable) texts.push(readable);
    }
  }
  
  // Combine and clean text
  let result = texts.join(' ');
  
  // If we didn't get much text, try a more aggressive approach
  if (result.length < 100) {
    const allReadable = content.match(/[a-zA-Z0-9\s\.,;:!?@#$%&*()_+=\-'"\[\]{}|\/\\]{20,}/g);
    if (allReadable) {
      result = allReadable
        .filter(s => !s.includes('endobj') && !s.includes('stream') && s.trim().length > 10)
        .join(' ');
    }
  }
  
  return result.trim();
}

function decodeText(text: string): string {
  return text
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(.)/g, '$1')
    .trim();
}

function extractReadableText(data: string): string {
  // Extract sequences of readable characters
  const readable = data.match(/[a-zA-Z0-9\s\.,;:!?@#$%&*()_+=\-'"\[\]{}|\/\\]{10,}/g);
  if (readable) {
    return readable.join(' ').trim();
  }
  return '';
}
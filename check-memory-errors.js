const fetch = require('node-fetch');

async function checkMemoryErrors() {
  const url = process.argv[2] || 'https://tcs-purchase-order-hub.vercel.app';
  
  try {
    console.log(`Checking memory errors from: ${url}/api/memory-errors`);
    
    // Try POST with secret
    const response = await fetch(`${url}/api/memory-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ check: 'show-errors-2024' })
    });
    
    if (!response.ok) {
      console.log('POST failed, trying GET...');
      const getResponse = await fetch(`${url}/api/memory-errors`);
      const getData = await getResponse.json();
      console.log(JSON.stringify(getData, null, 2));
      return;
    }
    
    const data = await response.json();
    
    console.log(`\nFound ${data.count} total errors\n`);
    console.log(`Recent errors (last 5 minutes): ${data.recent?.length || 0}\n`);
    
    if (data.recent && data.recent.length > 0) {
      console.log('=== RECENT ERRORS ===');
      data.recent.forEach((err, index) => {
        console.log(`\n--- Error ${index + 1} ---`);
        console.log(`Time: ${err.timestamp}`);
        console.log(`Source: ${err.source}`);
        console.log(`Error: ${err.error.message}`);
        
        if (err.context) {
          console.log('\nContext:');
          console.log(JSON.stringify(err.context, null, 2));
        }
      });
    }
    
    if (data.errors && data.errors.length > 0) {
      console.log('\n=== ALL ERRORS ===');
      console.log(JSON.stringify(data.errors, null, 2));
    }
  } catch (error) {
    console.error('Failed to fetch errors:', error.message);
  }
}

checkMemoryErrors();
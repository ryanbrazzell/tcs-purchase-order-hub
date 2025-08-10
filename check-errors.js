const fetch = require('node-fetch');

async function checkErrors() {
  const url = process.argv[2] || 'https://tcs-purchase-order-hub.vercel.app';
  
  try {
    console.log(`Checking errors from: ${url}/api/errors`);
    
    const response = await fetch(`${url}/api/errors`);
    const data = await response.json();
    
    console.log(`\nFound ${data.count} errors\n`);
    
    if (data.errors && data.errors.length > 0) {
      data.errors.forEach((err, index) => {
        console.log(`\n=== Error ${index + 1} ===`);
        console.log(`Time: ${err.timestamp}`);
        console.log(`Source: ${err.source}`);
        console.log(`Error: ${err.error.message}`);
        
        if (err.context) {
          console.log('\nContext:');
          console.log(JSON.stringify(err.context, null, 2));
        }
        
        if (err.error.stack) {
          console.log('\nStack:');
          console.log(err.error.stack);
        }
      });
    }
  } catch (error) {
    console.error('Failed to fetch errors:', error.message);
  }
}

checkErrors();
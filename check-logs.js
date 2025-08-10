const fetch = require('node-fetch');

async function checkLogs() {
  try {
    const response = await fetch('https://tcs-purchase-order-edsyb05tk-ryan-brazzells-projects.vercel.app/api/logs');
    const data = await response.json();
    
    console.log('=== Recent Logs ===');
    console.log(JSON.stringify(data, null, 2));
    
    // Look for errors
    const errors = data.logs?.filter(log => log.level === 'error') || [];
    if (errors.length > 0) {
      console.log('\n=== Errors Found ===');
      errors.forEach(err => {
        console.log(`[${err.timestamp}] ${err.source}: ${err.message}`);
        if (err.data) {
          console.log('Data:', JSON.stringify(err.data, null, 2));
        }
      });
    }
  } catch (error) {
    console.error('Failed to fetch logs:', error);
  }
}

checkLogs();
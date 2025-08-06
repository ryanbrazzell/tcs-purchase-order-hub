#!/usr/bin/env node

const http = require('http');

console.log('Testing TCS Purchase Order Hub Endpoints\n');
console.log('========================================\n');

// Test simple endpoints
const endpoints = [
  { path: '/api/test', method: 'GET', name: 'Test Endpoint' },
  { path: '/api/extract-mock', method: 'GET', name: 'Mock Extract Info' },
  { path: '/api/debug', method: 'GET', name: 'Debug Endpoint' }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    console.log(`Testing ${endpoint.name} (${endpoint.method} ${endpoint.path})...`);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ Status: ${res.statusCode}`);
          console.log(`   Response: ${JSON.stringify(json, null, 2).split('\n').join('\n   ')}`);
        } catch (e) {
          console.log(`❌ Status: ${res.statusCode}`);
          console.log(`   Error parsing JSON: ${e.message}`);
          console.log(`   Raw response: ${data.substring(0, 100)}...`);
        }
        console.log('');
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`❌ Connection error: ${e.message}`);
      console.log('   Make sure the server is running: npm run dev\n');
      resolve();
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('Make sure your Next.js server is running on http://localhost:3000\n');
  
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n📝 Summary:');
  console.log('- If you see connection errors, start the server: npm run dev');
  console.log('- The mock endpoint at /api/extract-mock should return test info');
  console.log('- Upload a PDF to /api/extract-mock (POST) to get mock extracted data');
  console.log('- Once working, we can implement real PDF extraction logic');
}

runTests();
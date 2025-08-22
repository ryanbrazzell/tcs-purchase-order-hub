#!/usr/bin/env node
/**
 * Simple test runner for the Combined Extraction API
 * Usage: node run-api-tests.js
 */

const { runAllTests } = require('./test-api-combined');

console.log('\n🔍 Combined Extraction API Test Suite');
console.log('Testing endpoint: /api/parse-proposal-combined');
console.log('\nNOTE: Make sure the Next.js dev server is running (npm run dev) before running these tests.\n');

// Add a small delay to let any startup messages finish
setTimeout(() => {
  runAllTests()
    .then(() => {
      console.log('\n🏁 Test execution completed.');
    })
    .catch(error => {
      console.error('\n❌ Test execution failed:', error.message);
      process.exit(1);
    });
}, 1000);
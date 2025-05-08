const fs = require('fs');
const {GoogleAuth} = require('google-auth-library');
const axios = require('axios');
require('dotenv').config();

// Configuration from environment variables with defaults
let TARGET_AUDIENCE = process.env.TARGET_AUDIENCE || 'https://uae-production-uae-production-runtime-918766210422.asia-southeast1.run.app';
let API_ENDPOINT = process.env.API_ENDPOINT || '/test/auth';

// Construct the target URL from audience and endpoint
let TARGET_URL = TARGET_AUDIENCE + API_ENDPOINT;

// Load testing configuration from environment variables with defaults
const CONFIG = {
  concurrentRequests: parseInt(process.env.CONCURRENT_REQUESTS || '10', 10),
  totalRequests: parseInt(process.env.TOTAL_REQUESTS || '100', 10),
  delayBetweenBatches: parseInt(process.env.DELAY_BETWEEN_BATCHES || '1000', 10),
  detailedLogging: process.env.DETAILED_LOGGING === 'true',
  summaryOnly: process.env.SUMMARY_ONLY === 'true',
  authMethod: process.env.AUTH_METHOD || 'both',
  serviceKeyPath: process.env.SERVICE_KEY_PATH || './service_key.json'
};

// Statistics tracking
const stats = {
  successful: 0,
  failed: 0,
  startTime: null,
  endTime: null,
  responseTimes: [],
  errors: {}
};

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--concurrent' && i + 1 < args.length) {
    CONFIG.concurrentRequests = parseInt(args[++i], 10);
  } else if (arg === '--total' && i + 1 < args.length) {
    CONFIG.totalRequests = parseInt(args[++i], 10);
  } else if (arg === '--delay' && i + 1 < args.length) {
    CONFIG.delayBetweenBatches = parseInt(args[++i], 10);
  } else if (arg === '--detailed') {
    CONFIG.detailedLogging = true;
  } else if (arg === '--summary-only') {
    CONFIG.summaryOnly = true;
  } else if (arg === '--auth-method' && i + 1 < args.length) {
    const method = args[++i].toLowerCase();
    if (['auth', 'x-auth', 'both'].includes(method)) {
      CONFIG.authMethod = method;
    } else {
      console.error(`Invalid auth method: ${method}. Must be 'auth', 'x-auth', or 'both'`);
      process.exit(1);
    }
  } else if (arg === '--key-file' && i + 1 < args.length) {
    CONFIG.serviceKeyPath = args[++i];
  } else if (arg === '--target-audience' && i + 1 < args.length) {
    TARGET_AUDIENCE = args[++i];
    // Update TARGET_URL after changing TARGET_AUDIENCE
    TARGET_URL = TARGET_AUDIENCE + API_ENDPOINT;
  } else if (arg === '--api-endpoint' && i + 1 < args.length) {
    API_ENDPOINT = args[++i];
    // Update TARGET_URL after changing API_ENDPOINT
    TARGET_URL = TARGET_AUDIENCE + API_ENDPOINT;
  } else if (arg === '--help') {
    console.log(`
Usage: node test-auth-both-headers.js [options]

Options:
  --concurrent <number>     Number of concurrent requests (default: 10)
  --total <number>          Total number of requests (default: 100)
  --delay <number>          Delay between batches in ms (default: 1000)
  --auth-method <method>    Authentication method: 'auth', 'x-auth', or 'both' (default: 'both')
  --key-file <path>         Path to the service account key file (default: './service_key.json')
  --target-audience <url>   Target audience for authentication (default: from env or hardcoded)
  --api-endpoint <path>     API endpoint path (default: from env or '/test/auth')
  --detailed                Enable detailed logging for each request
  --summary-only            Show only the final summary
  --help                    Show this help message

Environment Variables (can be set in .env file):
  # Required
  TARGET_AUDIENCE           Target audience for authentication
  API_ENDPOINT              API endpoint path
  SERVICE_KEY_PATH          Path to the service account key file

  # Optional
  AUTH_METHOD               Authentication method: 'auth', 'x-auth', or 'both'
  CONCURRENT_REQUESTS       Number of concurrent requests
  TOTAL_REQUESTS            Total number of requests
  DELAY_BETWEEN_BATCHES     Delay between batches in ms
  DETAILED_LOGGING          Enable detailed logging (true/false)
  SUMMARY_ONLY              Show only the final summary (true/false)

Examples:
  # Using environment variables
  TARGET_AUDIENCE=https://example.com API_ENDPOINT=/auth node test-auth-both-headers.js

  # Using command-line arguments
  node test-auth-both-headers.js --target-audience https://example.com --api-endpoint /auth
    `);
    process.exit(0);
  }
}

// Set up authentication with the service account key
process.env.GOOGLE_APPLICATION_CREDENTIALS = CONFIG.serviceKeyPath;
const auth = new GoogleAuth();

async function request(id) {
  const startTime = Date.now();

  if (!CONFIG.summaryOnly && !CONFIG.detailedLogging) {
    process.stdout.write('.');  // Simple progress indicator
  }

  if (CONFIG.detailedLogging) {
    console.info(`[${id}] Requesting ${TARGET_URL} with target audience ${TARGET_AUDIENCE}`);
    console.info(`[${id}] Using auth method: ${CONFIG.authMethod}`);
  }

  try {
    // Get an ID token client for the target audience
    const client = await auth.getIdTokenClient(TARGET_AUDIENCE);

    // Get the ID token
    const idToken = await client.idTokenProvider.fetchIdToken(TARGET_AUDIENCE);

    if (CONFIG.detailedLogging) {
      console.info(`[${id}] Generated ID token:`, idToken);
    }

    // Prepare headers based on the authentication method
    const headers = {};

    if (CONFIG.authMethod === 'auth') {
      headers['Authorization'] = `Bearer ${idToken}`;
      if (CONFIG.detailedLogging) {
        console.info(`[${id}] Sending request with Authorization header`);
      }
    } else if (CONFIG.authMethod === 'x-auth') {
      headers['X-Serverless-Authorization'] = `Bearer ${idToken}`;
      if (CONFIG.detailedLogging) {
        console.info(`[${id}] Sending request with X-Serverless-Authorization header`);
      }
    } else if (CONFIG.authMethod === 'both') {
      headers['Authorization'] = 'Bearer invalid-token-to-demonstrate-precedence';
      headers['X-Serverless-Authorization'] = `Bearer ${idToken}`;
      if (CONFIG.detailedLogging) {
        console.info(`[${id}] Sending request with both Authorization and X-Serverless-Authorization headers`);
        console.info(`[${id}] (According to documentation, only X-Serverless-Authorization will be checked if both are provided)`);
      }
    }

    // Make the request with the appropriate headers
    const res = await axios.get(TARGET_URL, { headers });

    if (CONFIG.detailedLogging) {
      console.info(`[${id}] Response status:`, res.status);
      console.info(`[${id}] Response data:`, res.data);
    }

    // Track statistics
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: true,
      id,
      responseTime,
      status: res.status,
      authMethod: CONFIG.authMethod
    };
  } catch (error) {
    if (CONFIG.detailedLogging) {
      console.error(`[${id}] Error details:`);
      if (error.response) {
        console.error(`[${id}] Status:`, error.response.status);
        console.error(`[${id}] Headers:`, JSON.stringify(error.response.headers, null, 2));
        console.error(`[${id}] Data:`, error.response.data);
      } else {
        console.error(`[${id}] Error message:`, error.message);
        console.error(`[${id}] Error stack:`, error.stack);
      }
    }

    // Track error statistics
    const errorType = error.response ? `HTTP ${error.response.status}` : error.code || 'UNKNOWN';

    return {
      success: false,
      id,
      responseTime: Date.now() - startTime,
      errorType,
      authMethod: CONFIG.authMethod
    };
  }
}

function printSummary() {
  const totalTime = stats.endTime - stats.startTime;
  const avgResponseTime = stats.responseTimes.reduce((sum, time) => sum + time, 0) / stats.responseTimes.length;

  // Sort response times to calculate percentiles
  stats.responseTimes.sort((a, b) => a - b);
  const p50 = stats.responseTimes[Math.floor(stats.responseTimes.length * 0.5)];
  const p90 = stats.responseTimes[Math.floor(stats.responseTimes.length * 0.9)];
  const p95 = stats.responseTimes[Math.floor(stats.responseTimes.length * 0.95)];
  const p99 = stats.responseTimes[Math.floor(stats.responseTimes.length * 0.99)];

  // Get a human-readable description of the auth method
  let authMethodDesc = '';
  switch (CONFIG.authMethod) {
    case 'auth':
      authMethodDesc = 'Authorization header only';
      break;
    case 'x-auth':
      authMethodDesc = 'X-Serverless-Authorization header only';
      break;
    case 'both':
      authMethodDesc = 'Both headers (X-Serverless-Authorization takes precedence)';
      break;
  }

  console.log('\n========================================');
  console.log('           LOAD TEST SUMMARY            ');
  console.log('========================================');
  console.log(`Authentication Method: ${authMethodDesc}`);
  console.log(`Service Key: ${CONFIG.serviceKeyPath}`);
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`Target Audience: ${TARGET_AUDIENCE}`);
  console.log(`Total Requests: ${CONFIG.totalRequests}`);
  console.log(`Successful: ${stats.successful} (${(stats.successful / CONFIG.totalRequests * 100).toFixed(2)}%)`);
  console.log(`Failed: ${stats.failed} (${(stats.failed / CONFIG.totalRequests * 100).toFixed(2)}%)`);
  console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`Requests Per Second: ${(CONFIG.totalRequests / (totalTime / 1000)).toFixed(2)}`);
  console.log('\nResponse Times:');
  console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Median (P50): ${p50}ms`);
  console.log(`  P90: ${p90}ms`);
  console.log(`  P95: ${p95}ms`);
  console.log(`  P99: ${p99}ms`);
  console.log(`  Min: ${stats.responseTimes[0]}ms`);
  console.log(`  Max: ${stats.responseTimes[stats.responseTimes.length - 1]}ms`);

  if (stats.failed > 0) {
    console.log('\nError Types:');
    for (const [errorType, count] of Object.entries(stats.errors)) {
      console.log(`  ${errorType}: ${count} (${(count / stats.failed * 100).toFixed(2)}%)`);
    }
  }

  console.log('========================================');
}

async function runLoadTest() {
  console.log(`Starting load test with ${CONFIG.totalRequests} total requests, ${CONFIG.concurrentRequests} concurrent`);
  stats.startTime = Date.now();

  // Calculate number of batches
  const batches = Math.ceil(CONFIG.totalRequests / CONFIG.concurrentRequests);

  for (let batch = 0; batch < batches; batch++) {
    const batchStart = batch * CONFIG.concurrentRequests;
    const batchSize = Math.min(CONFIG.concurrentRequests, CONFIG.totalRequests - batchStart);

    if (!CONFIG.summaryOnly) {
      console.log(`\nBatch ${batch + 1}/${batches} (Requests ${batchStart + 1}-${batchStart + batchSize})`);
    }

    // Create an array of promises for this batch
    const promises = [];
    for (let i = 0; i < batchSize; i++) {
      const requestId = batchStart + i + 1;
      promises.push(request(requestId));
    }

    // Wait for all requests in this batch to complete
    const results = await Promise.all(promises);

    // Process results
    for (const result of results) {
      if (result.success) {
        stats.successful++;
      } else {
        stats.failed++;
        stats.errors[result.errorType] = (stats.errors[result.errorType] || 0) + 1;
      }
      stats.responseTimes.push(result.responseTime);

      if (CONFIG.detailedLogging) {
        console.log(`Request ${result.id}: ${result.success ? 'Success' : 'Failed'} (${result.responseTime}ms)`);
      }
    }

    // Add delay between batches (if not the last batch)
    if (batch < batches - 1 && CONFIG.delayBetweenBatches > 0) {
      if (!CONFIG.summaryOnly) {
        console.log(`Waiting ${CONFIG.delayBetweenBatches}ms before next batch...`);
      }
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
    }
  }

  stats.endTime = Date.now();
  printSummary();
}

// Execute the load test
runLoadTest()
  .then(() => console.log('Load test completed'))
  .catch(error => {
    console.error('Load test failed with error:', error);
    process.exit(1);
  });

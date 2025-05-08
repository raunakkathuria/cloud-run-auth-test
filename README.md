# cloud-run-auth-test

A specialized tool for load testing Google Cloud Run authentication endpoints using service account keys, with support for multiple authentication header methods and comprehensive performance metrics.

## Features

- Test with different authentication methods:
  - Authorization header only
  - X-Serverless-Authorization header only
  - Both headers (X-Serverless-Authorization takes precedence)
- Configurable load testing parameters:
  - Number of concurrent requests
  - Total number of requests
  - Delay between batches
- Detailed logging of requests and responses
- Comprehensive summary statistics:
  - Success/failure rates
  - Response time statistics (average, median, percentiles)
  - Error type breakdown

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the example environment file:
   ```
   cp .env.example .env
   ```
4. Edit the `.env` file with your configuration

## Configuration

You can configure the tool using environment variables (in a `.env` file) or command-line arguments.

### Required Configuration

| Environment Variable | Command-line Argument | Description |
|----------------------|----------------------|-------------|
| `TARGET_AUDIENCE` | `--target-audience` | Target audience for authentication |
| `API_ENDPOINT` | `--api-endpoint` | API endpoint path |
| `SERVICE_KEY_PATH` | `--key-file` | Path to the service account key file |

### Optional Configuration

| Environment Variable | Command-line Argument | Default | Description |
|----------------------|----------------------|---------|-------------|
| `AUTH_METHOD` | `--auth-method` | `both` | Authentication method: 'auth', 'x-auth', or 'both' |
| `CONCURRENT_REQUESTS` | `--concurrent` | `10` | Number of concurrent requests |
| `TOTAL_REQUESTS` | `--total` | `100` | Total number of requests |
| `DELAY_BETWEEN_BATCHES` | `--delay` | `1000` | Delay between batches in ms |
| `DETAILED_LOGGING` | `--detailed` | `false` | Enable detailed logging for each request |
| `SUMMARY_ONLY` | `--summary-only` | `false` | Show only the final summary |

## Usage

### Using Environment Variables

1. Configure your `.env` file
2. Run the script using one of these methods:
   ```
   # Using node directly
   node cloud-run-auth-test.js

   # Using npm scripts
   npm start
   npm run start:detailed  # With detailed logging
   npm run start:summary   # With summary only
   ```

### Using Command-line Arguments

```
node cloud-run-auth-test.js --target-audience https://example.com --api-endpoint /auth --total 50 --concurrent 5
```

### Using npm Scripts with Arguments

```
npm start -- --target-audience https://example.com --api-endpoint /auth --total 50 --concurrent 5
```

### Get Help

```
node cloud-run-auth-test.js --help
```

## Examples

### Basic Test with Default Settings

```
node cloud-run-auth-test.js
```

### Test with Authorization Header Only

```
node cloud-run-auth-test.js --auth-method auth
```

### High-load Test

```
node cloud-run-auth-test.js --total 1000 --concurrent 50 --delay 2000
```

### Detailed Logging

```
node cloud-run-auth-test.js --detailed
```

### Summary Only

```
node cloud-run-auth-test.js --summary-only
```

## Error Handling

The tool logs detailed error information when requests fail, including:
- HTTP status codes
- Error response headers and data
- Error messages and stack traces

This information is useful for debugging authentication issues.

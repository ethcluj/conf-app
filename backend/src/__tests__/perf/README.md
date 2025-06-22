# QnA Performance Testing

This directory contains scripts to perform load and performance testing on the ETHCluj Conference QnA system.

## Overview

The test simulates multiple concurrent users performing actions on the QnA system:
- Creating questions
- Upvoting questions
- All while respecting configured throttling parameters

## Configuration

Edit `config.yaml` to customize the test parameters:

- `api`: Configuration for the API connection
  - `baseUrl`: The base URL of the API (e.g., "https://api.ethcluj.org")
  - `timeout`: Request timeout in milliseconds

- `parameters`: Test execution parameters
  - `questionsPerSession`: Number of questions to create per session (default: 20)
  - `upvotesPerSession`: Number of votes to distribute per session (default: 100) 
  - `parallelSessions`: Number of QnA sessions to test in parallel (default: 1)
  - `sessionPopulationTimeMinutes`: Time to populate one session (default: 1 minute)
  - `fetchAllSessions`: When set to `true`, automatically fetches all available sessions from the API instead of using the explicitly defined session list (default: false)

- `sessions`: List of session IDs to test (used only when `fetchAllSessions` is `false`)
  - `id`: Session ID
  - `name`: Session name (for logging)

- `users`: List of users for testing
  - `email`: User email
  - `displayName`: User display name
  - `authToken`: Authentication token (must be pre-configured)

## Authentication Tokens

**Important:** You need to obtain auth tokens for each test user before running the tests.

1. Use the QnA authentication flow to sign in with each test user email
2. Extract the auth token from the response
3. Add the token to the `config.yaml` file

## Running the Tests

Run the performance tests with:

```bash
npm run perf-test
```

## Output

The script provides detailed logs of:
- Test parameters
- Question creation
- Vote distribution
- Timing information

## Understanding Results

- Watch for error rates in requests
- Monitor response times
- Compare results when modifying parameters
- Use these metrics to calibrate production system capacity

## Integration with Real-time Updates

The ETHCluj Conference QnA system uses Server-Sent Events (SSE) for real-time updates. This performance test focuses on write operations (creating questions and votes) which will trigger SSE events to connected clients. The test does not explicitly measure SSE performance.

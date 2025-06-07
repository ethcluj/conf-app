# ETHCluj Conference App Backend

Backend service for the ETHCluj conference app, providing API endpoints for sessions, speakers, and a simple key-value store.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables (see `.env.example` for a complete list):
   ```
   GOOGLE_SHEET_ID=your_google_sheet_id
   GOOGLE_SHEET_NAME=your_sheet_name
   GOOGLE_SPEAKERS_SHEET_NAME=Speakers
   GOOGLE_API_KEY=your_api_key (optional)
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Start the server:
   ```
   npm start
   ```

## Development

Run the development server with hot reloading:
```
npm run dev
```

## Testing

### Running Tests Locally

1. Run the test suite:
   ```
   npm test
   ```

2. Run tests with coverage report:
   ```
   npm test -- --coverage
   ```

3. Run a specific test file:
   ```
   npm test -- __tests__/sessions.test.ts
   ```

> **Note:** The tests use mocked dependencies and don't make actual API calls to Google Sheets. Environment variables are automatically mocked in the test setup file (`__tests__/setup.ts`), so you don't need to create a `.env.test` file.

### Test Structure

- `__tests__/setup.ts`: Global test setup and environment configuration
- `__tests__/mocks/`: Mock data and mock implementations for external dependencies
- Individual test files for each module in the codebase

### Test Coverage

The test suite aims to maintain at least:
- 70% branch coverage
- 80% function coverage
- 80% line coverage
- 80% statement coverage

## API Endpoints

### Sessions

- `GET /sessions`: Get all conference sessions
  - Query parameters:
    - `refresh=true`: Force refresh from data source

- `POST /refresh-sessions`: Manually trigger a refresh of session data
  - Returns: `{ success: true, count: number }`

### Speakers

- `GET /speakers`: Get all conference speakers
  - Query parameters:
    - `refresh=true`: Force refresh from data source

- `POST /refresh-speakers`: Manually trigger a refresh of speaker data
  - Returns: `{ success: true, count: number }`

### Database (Key-Value Store)

- `GET /value`: Get the most recent value from the store
  - Returns: `{ value: string }`

- `PUT /value`: Store a new value
  - Body: `{ value: string }`
  - Returns: `{ value: string }`

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3001 | No |
| DB_USER | Database user | postgres | No |
| DB_HOST | Database host | db | No |
| DB_NAME | Database name | value_db | No |
| DB_PASSWORD | Database password | postgres | No |
| DB_PORT | Database port | 5432 | No |
| GOOGLE_SHEET_ID | ID of the Google Sheet | - | Yes |
| GOOGLE_SHEET_NAME | Name of the schedule sheet | - | Yes |
| GOOGLE_SPEAKERS_SHEET_NAME | Name of the speakers sheet | Speakers | No |
| GOOGLE_API_KEY | Google API key for Sheets API | - | No* |

\* Required only if direct CSV fetch fails

## Data Sources

The app can fetch data from Google Sheets using two methods:
1. Direct CSV fetch (primary method)
2. Google Sheets API (fallback method)

This dual approach provides redundancy in case one method fails.

## Architecture

The backend follows a modular architecture:
- `index.ts`: Main entry point and API routes
- `sessions.ts`: Session data management
- `speakers.ts`: Speaker data management
- `schedule-manager.ts`: Schedule processing logic
- `google-sheets.ts`: Google Sheets API integration
- `direct-sheets-fetch.ts`: Direct CSV fetching
- `sheet-parser.ts`: Utility functions for parsing sheet data

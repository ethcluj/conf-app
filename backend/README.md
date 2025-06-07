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

### API Response Format

All API endpoints follow a standardized response format:

#### Success Response
```json
{
  "success": true,
  "data": { ... } // Response data varies by endpoint
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... } // Optional additional error details
}
```

### Sessions

- `GET /sessions`: Get all conference sessions
  - Query parameters:
    - `refresh=true`: Force refresh from data source
  - Success response:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "string",
          "title": "string",
          "description": "string",
          "speakers": "string",
          "stage": "string", // "Main", "Tech", "Biz", "Work", or "NA"
          "startTime": "string", // ISO datetime
          "endTime": "string", // ISO datetime
          "type": "string",
          "track": "string"
        },
        // ...
      ]
    }
    ```

- `POST /refresh-sessions`: Manually trigger a refresh of session data
  - Returns: `{ "success": true, "data": { "count": number } }`

### Speakers

- `GET /speakers`: Get all conference speakers
  - Query parameters:
    - `refresh=true`: Force refresh from data source
  - Success response:
    ```json
    {
      "success": true,
      "data": [
        {
          "name": "string",
          "org": "string",
          "social": "string", // URL
          "photo": "string", // URL
          "bio": "string"
        },
        // ...
      ]
    }
    ```

- `POST /refresh-speakers`: Manually trigger a refresh of speaker data
  - Returns: `{ "success": true, "data": { "count": number } }`

### Database (Key-Value Store)

- `GET /value`: Get the most recent value from the store
  - Returns: `{ "success": true, "data": { "value": string } }`

- `PUT /value`: Store a new value
  - Body: `{ "value": string }`
  - Returns: `{ "success": true, "data": { "value": string } }`

### Health Check

- `GET /health`: Check if the server is running
  - Returns: `{ "success": true, "data": { "status": "ok", "timestamp": "ISO datetime" } }`

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3001 | No |
| REFRESH_INTERVAL | Data refresh interval in milliseconds | 300000 (5 minutes) | No |
| DB_USER | Database user | postgres | No |
| DB_HOST | Database host | db | No |
| DB_NAME | Database name | value_db | No |
| DB_PASSWORD | Database password | postgres | No |
| DB_PORT | Database port | 5432 | No |
| GOOGLE_SHEET_ID | ID of the Google Sheet (found in the sheet URL) | - | Yes |
| GOOGLE_SHEET_NAME | Name of the schedule sheet tab | Agenda  - APP - Visible | No |
| GOOGLE_SPEAKERS_SHEET_NAME | Name of the speakers sheet tab | Speakers | No |
| GOOGLE_API_KEY | Google API key for Sheets API | - | No* |

\* Required only if direct CSV fetch fails

### How to Find Google Sheet ID

The Google Sheet ID is the part of the URL between `/d/` and `/edit`. For example, in the URL:
```
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit#gid=0
```
The Sheet ID is `1AbCdEfGhIjKlMnOpQrStUvWxYz`.

### Sheet Format Requirements

#### Schedule Sheet
The schedule sheet must have the following columns in order:
1. Time Slot
2. Visible (true/false)
3. Stage (Main, Tech, Biz, Work, NA)
4. Title
5. Speakers
6. Description
7. Type
8. Track
9. Notes

#### Speakers Sheet
The speakers sheet must have the following columns in order:
1. Name
2. Organization
3. Social Link
4. Photo URL
5. Visible (true/false)
6. Bio

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

## Error Handling and Logging

### Error Handling Strategy

The application implements a consistent error handling strategy:

1. **Try-Catch Blocks**: All async operations and potentially failing code are wrapped in try-catch blocks.
2. **Graceful Degradation**: If a data source fails, the application attempts to use fallback methods.
3. **Standardized Error Responses**: All API endpoints return errors in a consistent format.
4. **Detailed Error Information**: Internal errors include context about where they occurred.

### Logging Practices

The application uses console logging with different severity levels:

1. **Error Logging**: `console.error()` for errors that affect functionality
   - Used for failed API calls, data parsing errors, and database failures
   - Includes error message and context about where the error occurred

2. **Warning Logging**: `console.warn()` for non-critical issues
   - Used for missing data, fallbacks, and potential configuration issues
   - Does not interrupt normal operation

3. **Info Logging**: `console.log()` for operational information
   - Server startup, data refresh operations, and configuration details
   - Useful for monitoring normal operation

### Data Validation

Data validation occurs at multiple levels:

1. **Input Validation**: API request validation for required fields and data types
2. **External Data Validation**: Google Sheet data is validated for required columns and data types
3. **Type Safety**: TypeScript interfaces ensure data consistency throughout the application

# ETHCluj Conference App Backend

Backend service for the ETHCluj 2025 conference app, providing API endpoints for sessions, speakers, Q&A functionality with real-time updates via Server-Sent Events (SSE), email verification, and a simple key-value store. This service integrates with Google Sheets to provide real-time event data.

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
   EMAIL_USER=your_email_address
   EMAIL_PASSWORD=your_app_password
   EMAIL_FROM="ETHCluj Conference <noreply@ethcluj.org>"
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

### Q&A System

- `GET /qna/questions/:sessionId`: Get all questions for a specific session
  - Query parameters: None
  - Headers:
    - `x-fingerprint`: Optional browser fingerprint for identifying the user
  - Success response: List of questions with vote information

- `POST /qna/questions`: Add a new question
  - Headers:
    - `Authorization`: Bearer token (optional)
    - `x-fingerprint`: Browser fingerprint
  - Body: `{ "sessionId": "string", "content": "string" }`
  - Success response: Created question object

- `POST /qna/questions/:id/vote`: Toggle vote on a question
  - Headers:
    - `Authorization`: Bearer token (optional)
    - `x-fingerprint`: Browser fingerprint
  - Success response: `{ "success": true, "data": { "voteAdded": boolean } }`

- `DELETE /qna/questions/:id`: Delete a question (only allowed for question author)
  - Headers:
    - `Authorization`: Bearer token (optional)
    - `x-fingerprint`: Browser fingerprint
  - Success response: `{ "success": true, "data": { "deleted": true } }`

- `PUT /qna/users/display-name`: Update user display name
  - Headers:
    - `Authorization`: Bearer token (optional)
    - `x-fingerprint`: Browser fingerprint
  - Body: `{ "displayName": "string" }`
  - Success response: Updated user object

- `GET /qna/leaderboard`: Get user leaderboard based on question votes
  - Success response: List of users with scores

### Email Verification

- `POST /qna/auth/send-code`: Send verification code via email
  - Body: `{ "email": "string" }`
  - Success response: `{ "success": true, "data": { "success": true, "message": "Verification code sent" } }`

- `POST /qna/auth/verify`: Verify email with code
  - Body: `{ "email": "string", "code": "string", "fingerprint": "string" }`
  - Success response: User object with authentication information

- `POST /qna/auth`: Authenticate user with fingerprint
  - Body: `{ "fingerprint": "string" }`
  - Success response: User object if authenticated

### Server-Sent Events (SSE)

- `GET /sse/events/:sessionId`: Subscribe to real-time updates for a session
  - This endpoint establishes a persistent connection that sends events when questions are added, deleted, or voted on
  - Events are sent in the format: `event: [event_type]\ndata: [JSON data]\n\n`
  - Event types: `question_added`, `question_deleted`, `vote_changed`

- `GET /sse/stats`: Get statistics about active SSE connections
  - Success response: `{ "totalConnections": number, "sessionConnections": { "[sessionId]": number } }`

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3001 | No |
| REFRESH_INTERVAL | Data refresh interval in milliseconds | 300000 (5 minutes) | No |
| POSTGRES_USER | Database user | postgres | No |
| POSTGRES_HOST | Database host | db | No |
| POSTGRES_DB | Database name | value_db | No |
| POSTGRES_PASSWORD | Database password | postgres | No |
| POSTGRES_PORT | Database port | 5432 | No |
| GOOGLE_SHEET_ID | ID of the Google Sheet (found in the sheet URL) | - | Yes |
| GOOGLE_SHEET_NAME | Name of the schedule sheet tab | Agenda  - APP - Visible | No |
| GOOGLE_SPEAKERS_SHEET_NAME | Name of the speakers sheet tab | Speakers | No |
| GOOGLE_API_KEY | Google API key for Sheets API | - | No* |
| EMAIL_USER | Gmail account for sending verification emails | - | Yes** |
| EMAIL_PASSWORD | App password for Gmail account | - | Yes** |
| EMAIL_FROM | Display name and email for verification emails | "ETHCluj Conference <noreply@ethcluj.org>" | No |

\* Required only if direct CSV fetch fails
\** Required for email verification functionality

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
7. Type (Session Level: For everyone, Beginner, Intermediate, Advanced)
8. Track (Ethereum Roadmap, DeFi, Security, Development, Research, Community)
9. Notes
10. Learning Points (optional)

#### Speakers Sheet
The speakers sheet must have the following columns in order:
1. Name
2. Organization
3. Social Link
4. Photo URL
5. Visible (true/false)
6. Bio

## Data Sources

The app fetches data from Google Sheets using two methods:
1. Direct CSV fetch (primary method) - Implemented in `direct-sheets-fetch.ts`
2. Google Sheets API (fallback method) - Implemented in `google-sheets.ts`

This dual approach provides redundancy in case one method fails. The app automatically refreshes data periodically based on the configured `REFRESH_INTERVAL`.

## Architecture

The backend follows a modular architecture:
- `index.ts`: Main entry point and API routes
- `sessions.ts`: Session data management and type definitions
- `speakers.ts`: Speaker data management and type definitions
- `schedule-manager.ts`: Schedule processing and transformation logic
- `google-sheets.ts`: Google Sheets API integration
- `direct-sheets-fetch.ts`: Direct CSV fetching from public Google Sheets
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

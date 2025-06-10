# ETHCluj Conference App

The official ETHCluj conference application with backend and UI components. This application provides conference schedule, speaker information, and other event details for the ETHCluj 2025 conference.

## Features

- Dynamic conference schedule from Google Sheets
- Speaker profiles and information
- Multiple stages and tracks support
- Responsive design for mobile and desktop
- Session favoriting and filtering
- Jump-to-current session functionality
- Session difficulty level indicators

## Docker Compose Setup (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Google Sheets API key (for schedule and speaker data)

### Environment Setup
1. Create a `.env` file in the root directory with the following variables:
```
POSTGRES_PASSWORD=your_database_password
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SHEET_NAME=APP
GOOGLE_SPEAKERS_SHEET_NAME=Speakers
GOOGLE_API_KEY=your_api_key
DATA_SOURCE=google-sheet
REFRESH_INTERVAL=60000
```

### Running the Application
1. Start all services:
   ```bash
   docker-compose up
   ```

2. Access the application:
   - UI: http://localhost:8080
   - Backend API: http://localhost:8080/api
   - API endpoints:
     - Schedule: http://localhost:8080/api/sessions
     - Speakers: http://localhost:8080/api/speakers
     - Health check: http://localhost:8080/api/health
     - Value (database): http://localhost:8080/api/value

3. Stop all services:
   ```bash
   docker-compose down
   ```

4. Rebuild containers after changes:
   ```bash
   docker-compose up --build
   ```

5. View logs:
   ```bash
   docker-compose logs -f [service_name]
   ```
   Available services: `ui`, `backend`, `db`, `nginx`

## Development Mode

### Backend Development
1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file with required environment variables:
   ```
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_HOST=localhost
   POSTGRES_DB=value_db
   POSTGRES_PORT=5432
   DATA_SOURCE=google-sheet
   GOOGLE_SHEET_ID=your_sheet_id
   GOOGLE_SHEET_NAME=APP
   GOOGLE_SPEAKERS_SHEET_NAME=Speakers
   GOOGLE_API_KEY=your_api_key
   ```

4. Run in development mode:
   ```bash
   npm run dev
   ```

5. Access the API at http://localhost:3001

### UI Development
1. Navigate to UI directory:
   ```bash
   cd ui
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Run in development mode:
   ```bash
   yarn dev
   ```

4. Access at http://localhost:3000

## Architecture

The application consists of:
- **Backend**: Node.js/Express API server
  - Provides API endpoints for schedule and speaker data
  - Connects to PostgreSQL database
  - Fetches data from Google Sheets
- **UI**: Next.js-based modern interface
  - Responsive design
  - Dynamic content loading
- **Nginx**: Reverse proxy that routes requests to appropriate services
  - Routes `/` to UI
  - Routes `/api` to backend
- **Database**: PostgreSQL database
  - Stores application data

## Data Sources

The application fetches data from Google Sheets using two methods:
1. **Direct CSV fetch**: Primary method that downloads sheets as CSV
2. **Google Sheets API**: Fallback method using the Google API

To configure:
- **Google Sheets**: Set `GOOGLE_SHEET_ID` to your spreadsheet ID
- **Sheet Names**: Set `GOOGLE_SHEET_NAME` and `GOOGLE_SPEAKERS_SHEET_NAME` appropriately
- **API Key**: Optionally set `GOOGLE_API_KEY` for API fallback method

The application periodically refreshes data based on `REFRESH_INTERVAL` (default: 1 minute)

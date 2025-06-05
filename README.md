# ETHCluj Conference App

The official ETHCluj conference application with backend and UI components. This application provides conference schedule, speaker information, and other event details.

## Features

- Dynamic conference schedule from Google Sheets
- Speaker profiles and information
- Multiple stages and tracks support
- Responsive design for mobile and desktop

## Docker Compose Setup (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- Google Sheets API key (for schedule and speaker data)

### Environment Setup
1. Create a `.env` file in the root directory with the following variables:
```
DB_PASSWORD=your_database_password
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SHEET_NAME=APP
GOOGLE_SPEAKERS_SHEET_NAME=Speakers
GOOGLE_API_KEY=your_api_key
DATA_SOURCE=google-sheet
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
     - Value: http://localhost:8080/api/value (health check)

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
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=localhost
   DB_NAME=value_db
   DB_PORT=5432
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

The application can be configured to use different data sources:
- **Google Sheets**: Set `DATA_SOURCE=google-sheet` (recommended)
- **CSV**: Set `DATA_SOURCE=csv` and provide CSV files
- **Hardcoded**: Set `DATA_SOURCE=hardcoded` for development/testing

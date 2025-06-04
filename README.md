# Conference App

The official ETHCluj conference application with backend and UI components.

## Docker Compose Setup

### Prerequisites
- Docker and Docker Compose installed

### Running the Application
1. Start all services:
   ```bash
   docker-compose up
   ```

2. Access the application:
   - UI: http://localhost:8080
   - Backend API: http://localhost:8080/api

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

### UI Development (New Interface)
1. Navigate to UI directory:
   ```bash
   cd ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Access at http://localhost:3000

## Architecture

The application consists of:
- **Backend**: Node.js/Express API server
- **UI**: Next.js-based modern interface
- **Nginx**: Reverse proxy that routes requests to appropriate services
- **Database**: PostgreSQL database

## Environment Configuration

See docker-compose.yml for all environment variables used by each service.
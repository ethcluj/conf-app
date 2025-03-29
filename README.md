# Value Editor Application

A full-stack application that allows users to view and edit a stored value. The application consists of a React frontend, Node.js backend, and PostgreSQL database, all orchestrated with Docker Compose.

## Features

- View stored value
- Edit value through an interactive interface
- Persistent storage in PostgreSQL
- Load balanced with Nginx
- Containerized with Docker

## Prerequisites

- Docker
- Docker Compose

## Project Structure

```
.
├── frontend/           # React frontend application
├── backend/           # Node.js backend API
├── nginx/             # Nginx configuration
├── docker-compose.yml # Docker Compose configuration
└── README.md          # This file
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd conf-app
   ```

2. Start the application:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost/api
   - Nginx: http://localhost

## Testing

### Frontend Tests
```bash
docker-compose exec frontend npm test
```

### Backend Tests
```bash
docker-compose exec backend npm test
```

### API Testing
You can test the API endpoints using curl or any API testing tool:

1. Get the current value:
   ```bash
   curl http://localhost/api/value
   ```

2. Update the value:
   ```bash
   curl -X PUT http://localhost/api/value \
     -H "Content-Type: application/json" \
     -d '{"value": "new value"}'
   ```

## Development

The application is set up for development with hot-reloading:

- Frontend changes will automatically reload
- Backend changes will automatically restart
- Database changes require container restart

## Stopping the Application

To stop the application:
```bash
docker-compose down
```

To stop and remove all data (including the database):
```bash
docker-compose down -v
```
#!/bin/bash
set -e

# ETHCluj Conference QnA Application Recovery Script
# This script performs a complete reset and fresh deployment of the application

# Configuration
APP_DIR="${APP_DIR:-/opt/conf-app}"
ENV_FILE="${APP_DIR}/.env"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.prod.yml"
BACKUP_DIR="${APP_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# Print colored output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print section headers
section() {
    echo -e "\n${GREEN}==== $1 ====${NC}"
}

# Function to print warnings
warning() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Function to print errors
error() {
    echo -e "${RED}ERROR: $1${NC}"
    exit 1
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Check if we're in the right directory
section "Checking environment"
if [ ! -d "${APP_DIR}" ]; then
    error "Application directory not found at ${APP_DIR}"
fi

# Backup database
section "Creating database backup"
if docker-compose -f "${COMPOSE_FILE}" ps | grep -q db; then
    echo "Creating database backup..."
    docker-compose -f "${COMPOSE_FILE}" exec -T db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-value_db}" > "${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
    echo "Database backup created at: ${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql"
else
    warning "Database container not running, skipping backup"
fi

# Stop all containers
section "Stopping all containers"
docker-compose -f "${COMPOSE_FILE}" down || true

# Clean Docker system
section "Cleaning Docker system"
echo "Removing unused Docker resources..."
docker system prune -f

# Reset application state
section "Resetting application state"
echo "Pulling latest code from repository..."
cd "${APP_DIR}"
git fetch --all
git reset --hard origin/main

# Ensure environment file exists
if [ ! -f "${ENV_FILE}" ]; then
    warning "Environment file not found, creating from example..."
    cp "${APP_DIR}/deploy/.env.example" "${ENV_FILE}"
    warning "Please update ${ENV_FILE} with your actual values"
    read -p "Press Enter to continue after updating the environment file..."
fi

# Rebuild from scratch
section "Rebuilding application from scratch"
docker-compose -f "${COMPOSE_FILE}" build --no-cache

# Copy .env file to deploy directory if it exists in root but not in deploy
if [ -f "$APP_DIR/.env" ] && [ ! -f "$(dirname "$COMPOSE_FILE")/.env" ]; then
  echo "Copying .env file to deploy directory..."
  cp "$APP_DIR/.env" "$(dirname "$COMPOSE_FILE")/.env"
fi

# Create Nginx SSL directory if it doesn't exist
section "Setting up Nginx SSL"
mkdir -p "${APP_DIR}/deploy/nginx/ssl"

# Copy SSL certificates if they exist
if [ -d "/etc/letsencrypt/live/qna.ethcluj.org" ]; then
  echo "Copying SSL certificates..."
  cp /etc/letsencrypt/live/qna.ethcluj.org/fullchain.pem "${APP_DIR}/deploy/nginx/ssl/fullchain.pem"
  cp /etc/letsencrypt/live/qna.ethcluj.org/privkey.pem "${APP_DIR}/deploy/nginx/ssl/privkey.pem"
  chmod 644 "${APP_DIR}/deploy/nginx/ssl/fullchain.pem" "${APP_DIR}/deploy/nginx/ssl/privkey.pem"
else
  warning "SSL certificates not found at /etc/letsencrypt/live/qna.ethcluj.org"
  warning "You may need to run the ssl-setup.sh script first"
fi

# Start fresh containers
section "Starting fresh containers"
docker-compose --env-file "$APP_DIR/.env" -f "${COMPOSE_FILE}" up -d

# Verify deployment
section "Verifying deployment"
echo "Waiting for services to start..."
sleep 10

# Check if containers are running
echo "Checking container status..."
docker-compose -f "${COMPOSE_FILE}" ps

# Check backend health
echo "Checking backend health..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/value | grep -q "200"; then
    echo "Backend is healthy!"
else
    warning "Backend health check failed!"
    echo "Checking backend logs..."
    docker-compose -f "${COMPOSE_FILE}" logs --tail=50 backend
fi

# Check nginx
echo "Checking nginx..."
if docker-compose -f "${COMPOSE_FILE}" ps | grep -q "nginx.*Up"; then
    echo "Nginx is running!"
else
    warning "Nginx is not running!"
    echo "Checking nginx logs..."
    docker-compose -f "${COMPOSE_FILE}" logs --tail=50 nginx
fi

section "Recovery complete!"
echo "The ETHCluj Conference QnA application has been reset and redeployed."
echo "If you need to restore data from backup, use the following command:"
echo "cat ${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql | docker-compose -f ${COMPOSE_FILE} exec -T db psql -U postgres value_db"

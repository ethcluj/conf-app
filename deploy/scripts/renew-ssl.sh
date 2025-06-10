#!/bin/bash
# ETHCluj Conference QnA Application SSL Certificate Renewal Script

# Configuration
APP_DIR="${APP_DIR:-/opt/conf-app}"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.prod.yml"
DOMAIN="app.ethcluj.org"
CERTS_DIR="${APP_DIR}/certs"
LOG_FILE="${APP_DIR}/ssl-renewal.log"

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

# Create certificates directory if it doesn't exist
mkdir -p "${CERTS_DIR}"

# Renew SSL certificates
section "Renewing SSL certificates"
certbot renew --quiet

# Check if renewal was successful
if [ $? -ne 0 ]; then
    error "Certificate renewal failed"
fi

# Copy the renewed certificates to the app directory
section "Copying certificates"
echo "Copying certificates to ${CERTS_DIR}..."
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem "${CERTS_DIR}/"
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem "${CERTS_DIR}/"

# Set appropriate permissions
section "Setting permissions"
echo "Setting appropriate permissions..."
chmod 644 "${CERTS_DIR}/fullchain.pem"
chmod 644 "${CERTS_DIR}/privkey.pem"

# If running as root, change ownership to the deploy user
if [ "$(id -u)" -eq 0 ]; then
    chown deploy:deploy "${CERTS_DIR}/fullchain.pem"
    chown deploy:deploy "${CERTS_DIR}/privkey.pem"
fi

# Restart Nginx container to pick up new certificates
section "Restarting Nginx"
echo "Restarting Nginx container..."
cd "${APP_DIR}"
docker-compose -f "${COMPOSE_FILE}" restart nginx

# Log the renewal attempt
echo "Certificate renewal completed successfully at $(date)" >> "${LOG_FILE}"

section "SSL renewal complete!"
echo "SSL certificates have been renewed and Nginx has been restarted."
echo "The renewal has been logged to ${LOG_FILE}"

#!/bin/bash
# ETHCluj Conference QnA Application SSL Certificate Setup Script

# Configuration
APP_DIR="${APP_DIR:-/opt/conf-app}"
DOMAIN="app.ethcluj.org"
EMAIL="your-email@example.com"  # Change this to your email
CERTS_DIR="${APP_DIR}/certs"

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

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
    error "This script must be run as root"
fi

# Create certificates directory
section "Creating certificates directory"
mkdir -p "${CERTS_DIR}"
chown deploy:deploy "${CERTS_DIR}"

# Install Certbot if not already installed
section "Installing Certbot"
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot
else
    echo "Certbot is already installed"
fi

# Stop Nginx if it's running to free port 80
section "Stopping Nginx"
echo "Stopping Nginx to free port 80..."
cd "${APP_DIR}"
docker-compose -f "${APP_DIR}/deploy/docker-compose.prod.yml" down nginx || true

# Get SSL certificate
section "Obtaining SSL certificate"
echo "Obtaining SSL certificate for ${DOMAIN}..."
certbot certonly --standalone --preferred-challenges http \
    --agree-tos --email "${EMAIL}" \
    -d "${DOMAIN}"

if [ $? -ne 0 ]; then
    error "Failed to obtain SSL certificate"
fi

# Copy certificates to app directory
section "Copying certificates"
echo "Copying certificates to ${CERTS_DIR}..."
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem "${CERTS_DIR}/"
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem "${CERTS_DIR}/"

# Set appropriate permissions
section "Setting permissions"
echo "Setting appropriate permissions..."
chmod 644 "${CERTS_DIR}/fullchain.pem"
chmod 644 "${CERTS_DIR}/privkey.pem"
chown deploy:deploy "${CERTS_DIR}/fullchain.pem"
chown deploy:deploy "${CERTS_DIR}/privkey.pem"

# Set up automatic renewal
section "Setting up automatic renewal"
echo "Setting up automatic renewal..."

# Create a cron job for certificate renewal
CRON_JOB="0 0 * * * /opt/conf-app/deploy/scripts/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1"
(crontab -l 2>/dev/null | grep -v "renew-ssl.sh"; echo "${CRON_JOB}") | crontab -

section "SSL setup complete!"
echo "SSL certificates have been obtained and configured."
echo "A cron job has been set up to automatically renew the certificates."
echo "You can now restart the application with: cd ${APP_DIR} && docker-compose -f deploy/docker-compose.prod.yml up -d"

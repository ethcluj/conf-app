#!/bin/bash
# ETHCluj Conference QnA Application SSL Fix Script

# Configuration
# Try to auto-detect APP_DIR if not set
if [ -z "${APP_DIR}" ]; then
    # Get the directory containing this script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # Go up two levels (from deploy/scripts/ to project root)
    APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
fi
APP_DIR="${APP_DIR:-/opt/conf-app}"
PRIMARY_DOMAIN="app.ethcluj.org"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${PRIMARY_DOMAIN}"
CERTS_DIR="${APP_DIR}/certs"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.prod.yml"

echo "Script configuration:"
echo "  APP_DIR: ${APP_DIR}"
echo "  LETSENCRYPT_DIR: ${LETSENCRYPT_DIR}"
echo "  CERTS_DIR: ${CERTS_DIR}"
echo "  Running as user: $(whoami)"
echo "  Current working directory: $(pwd)"

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

# Check if running as root (needed to access /etc/letsencrypt/)
if [ "$(id -u)" -ne 0 ]; then
    error "This script must be run as root to access SSL certificates. Try: sudo $0"
fi

# Check for SSL certificates
section "Checking for SSL certificates"

CERT_PATH=""
KEY_PATH=""

echo "Checking for SSL certificates..."
echo "  Looking for: ${LETSENCRYPT_DIR}/fullchain.pem"
echo "  File exists: $([ -f "${LETSENCRYPT_DIR}/fullchain.pem" ] && echo "YES" || echo "NO")"
echo "  Looking for: ${LETSENCRYPT_DIR}/privkey.pem"
echo "  File exists: $([ -f "${LETSENCRYPT_DIR}/privkey.pem" ] && echo "YES" || echo "NO")"
echo "  Looking for: ${CERTS_DIR}/fullchain.pem"
echo "  File exists: $([ -f "${CERTS_DIR}/fullchain.pem" ] && echo "YES" || echo "NO")"
echo "  Looking for: ${CERTS_DIR}/privkey.pem"
echo "  File exists: $([ -f "${CERTS_DIR}/privkey.pem" ] && echo "YES" || echo "NO")"

# Check Let's Encrypt directory first
if [ -f "${LETSENCRYPT_DIR}/fullchain.pem" ] && [ -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    CERT_PATH="/etc/letsencrypt/live/${PRIMARY_DOMAIN}/fullchain.pem"
    KEY_PATH="/etc/letsencrypt/live/${PRIMARY_DOMAIN}/privkey.pem"
    echo "SSL certificates found at ${LETSENCRYPT_DIR}"
# Check app certs directory as fallback
elif [ -f "${CERTS_DIR}/fullchain.pem" ] && [ -f "${CERTS_DIR}/privkey.pem" ]; then
    CERT_PATH="/etc/ssl/certs/fullchain.pem"
    KEY_PATH="/etc/ssl/certs/privkey.pem"
    echo "SSL certificates found at ${CERTS_DIR}"
else
    warning "SSL certificates not found!"
    echo ""
    echo "Checked locations:"
    echo "  - ${LETSENCRYPT_DIR}/"
    echo "  - ${CERTS_DIR}/"
    echo ""
    echo "To obtain SSL certificates, run the SSL setup script as root:"
    echo "  sudo ${APP_DIR}/deploy/scripts/ssl-setup.sh"
    echo ""
    echo "This will download certificates from Let's Encrypt and place them in both locations."
    echo ""
    echo "Note: If nginx is already working with SSL, ensure certificates are"
    echo "available in one of the checked locations."
    exit 1
fi

# Create HTTPS Nginx configuration
section "Creating HTTPS Nginx configuration"
cat > "${APP_DIR}/deploy/nginx/default.conf" << EOL
server {
    listen 80;
    server_name app.ethcluj.org;
    return 301 https://\$host\$request_uri;
}

server {
    listen 80;
    server_name ethcluj.org www.ethcluj.org;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name app.ethcluj.org;

    ssl_certificate ${CERT_PATH};
    ssl_certificate_key ${KEY_PATH};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # UI
    location / {
        proxy_pass http://ui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        rewrite ^/api(/.*)\$ \$1 break;
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}

server {
    listen 443 ssl;
    server_name ethcluj.org www.ethcluj.org;

    ssl_certificate ${CERT_PATH};
    ssl_certificate_key ${KEY_PATH};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOL

# Restart Nginx
section "Restarting Nginx"
cd "${APP_DIR}"
docker compose -f "${COMPOSE_FILE}" restart nginx

# Check Nginx status
section "Checking Nginx status"
sleep 3
docker compose -f "${COMPOSE_FILE}" ps nginx
docker compose -f "${COMPOSE_FILE}" logs --tail=20 nginx

section "SSL fix complete!"
echo "HTTPS should now be working at:"
echo "  - https://app.ethcluj.org"
echo "  - https://ethcluj.org"
echo "  - https://www.ethcluj.org"
echo "HTTP requests should redirect to HTTPS"

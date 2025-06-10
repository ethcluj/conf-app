#!/bin/bash
# ETHCluj Conference QnA Application SSL Fix Script

# Configuration
APP_DIR="${APP_DIR:-/opt/conf-app}"
DOMAIN="app.ethcluj.org"
CERTS_DIR="${APP_DIR}/certs"
NGINX_SSL_DIR="${APP_DIR}/deploy/nginx/ssl"
COMPOSE_FILE="${APP_DIR}/deploy/docker-compose.prod.yml"

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

# Create Nginx SSL directory
section "Creating Nginx SSL directory"
mkdir -p "${NGINX_SSL_DIR}"
chmod 755 "${NGINX_SSL_DIR}"

# Check for certificates in all possible locations
section "Checking for SSL certificates"

# Define a function to copy certificates if they exist
copy_certs() {
    local src_dir="$1"
    echo "Found certificates in ${src_dir}"
    echo "Copying to ${NGINX_SSL_DIR}..."
    cp "${src_dir}/fullchain.pem" "${NGINX_SSL_DIR}/fullchain.pem"
    cp "${src_dir}/privkey.pem" "${NGINX_SSL_DIR}/privkey.pem"
    chmod 644 "${NGINX_SSL_DIR}/fullchain.pem" "${NGINX_SSL_DIR}/privkey.pem"
    return 0
}

# Try to find certificates in different locations
if [ -f "${CERTS_DIR}/fullchain.pem" ] && [ -f "${CERTS_DIR}/privkey.pem" ]; then
    copy_certs "${CERTS_DIR}"
    FOUND=true
elif [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
    copy_certs "/etc/letsencrypt/live/${DOMAIN}"
    FOUND=true
else
    warning "No SSL certificates found!"
    exit 1
fi

# Create HTTPS Nginx configuration
section "Creating HTTPS Nginx configuration"
cat > "${APP_DIR}/deploy/nginx/default.conf" << 'EOL'
server {
    listen 80;
    server_name app.ethcluj.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.ethcluj.org;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # UI
    location / {
        proxy_pass http://ui:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        rewrite ^/api(/.*)$ $1 break;
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

# Restart Nginx
section "Restarting Nginx"
cd "${APP_DIR}"
docker-compose -f "${COMPOSE_FILE}" restart nginx

# Check Nginx status
section "Checking Nginx status"
sleep 3
docker-compose -f "${COMPOSE_FILE}" ps nginx
docker-compose -f "${COMPOSE_FILE}" logs --tail=20 nginx

section "SSL fix complete!"
echo "HTTPS should now be working at https://${DOMAIN}"
echo "HTTP requests should redirect to HTTPS"

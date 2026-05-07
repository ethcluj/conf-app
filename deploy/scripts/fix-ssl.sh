#!/bin/bash
# ETHCluj Conference QnA Application SSL Fix Script

# Configuration
APP_DIR="${APP_DIR:-/opt/conf-app}"
PRIMARY_DOMAIN="app.ethcluj.org"
LETSENCRYPT_DIR="/etc/letsencrypt/live/${PRIMARY_DOMAIN}"
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

# Check for SSL certificates
section "Checking for SSL certificates"

if [ ! -f "${LETSENCRYPT_DIR}/fullchain.pem" ] || [ ! -f "${LETSENCRYPT_DIR}/privkey.pem" ]; then
    warning "SSL certificates not found at ${LETSENCRYPT_DIR}!"
    warning "Please ensure Certbot has been run for ${PRIMARY_DOMAIN}"
    exit 1
fi

echo "SSL certificates found at ${LETSENCRYPT_DIR}"

# Create HTTPS Nginx configuration
section "Creating HTTPS Nginx configuration"
cat > "${APP_DIR}/deploy/nginx/default.conf" << 'EOL'
server {
    listen 80;
    server_name app.ethcluj.org;
    return 301 https://$host$request_uri;
}

server {
    listen 80;
    server_name ethcluj.org www.ethcluj.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.ethcluj.org;

    ssl_certificate /etc/letsencrypt/live/app.ethcluj.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.ethcluj.org/privkey.pem;
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

server {
    listen 443 ssl;
    server_name ethcluj.org www.ethcluj.org;

    ssl_certificate /etc/letsencrypt/live/app.ethcluj.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.ethcluj.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
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
for domain in "${DOMAINS[@]}"; do
    echo "  - https://${domain}"
done
echo "HTTP requests should redirect to HTTPS"

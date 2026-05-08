#!/bin/bash
set -e

# ETHCluj Conference QnA Application Deployment Script
# This script handles the deployment of the ETHCluj Conference QnA application

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
if [ ! -f "${COMPOSE_FILE}" ]; then
    error "Docker Compose file not found at ${COMPOSE_FILE}"
fi

# Check if .env file exists, create if not
if [ ! -f "${ENV_FILE}" ]; then
    warning "Environment file not found, creating from example..."
    cp "${APP_DIR}/deploy/.env.example" "${ENV_FILE}"
    warning "Please update ${ENV_FILE} with your actual values"
    exit 1
fi

# Backup database
section "Creating database backup"
mkdir -p "${BACKUP_DIR}"
if docker-compose -f "${COMPOSE_FILE}" ps | grep -q db; then
    echo "Creating database backup..."
    docker-compose -f "${COMPOSE_FILE}" exec -T db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-value_db}" > "${BACKUP_DIR}/postgres_backup_${TIMESTAMP}.sql"
    echo "Database backup created at: ${BACKUP_DIR}/postgres_backup_${TIMESTAMP}.sql"
else
    warning "Database container not running, skipping backup"
fi

# Pull latest code
git pull

# Remove lockfiles to ensure fresh dependency resolution
section "Cleaning lockfiles"
echo "Removing yarn.lock and package-lock.json files for fresh installs..."
rm -f ui/yarn.lock backend/package-lock.json
echo "Lockfiles removed"

# Copy .env file to deploy directory if it exists in root but not in deploy
if [ -f "$APP_DIR/.env" ] && [ ! -f "$(dirname "$COMPOSE_FILE")/.env" ]; then
  echo "Copying .env file to deploy directory..."
  cp "$APP_DIR/.env" "$(dirname "$COMPOSE_FILE")/.env"
fi

# Ensure .htpasswd file exists (create empty one only if completely missing)
HTPASSWD_FILE="$(dirname "$COMPOSE_FILE")/.htpasswd"
if [ ! -f "$HTPASSWD_FILE" ]; then
  echo "Creating empty .htpasswd file for authentication..."
  cat > "$HTPASSWD_FILE" << 'EOF'
# Empty htpasswd file - authentication disabled
# To enable authentication, run: cd deploy/scripts && bash create-htpasswd.sh <username> <password>
# This will replace this file with actual credentials
EOF
elif [ ! -s "$HTPASSWD_FILE" ] || grep -q "^# Empty htpasswd file" "$HTPASSWD_FILE"; then
  echo "Found empty or placeholder .htpasswd file, leaving as-is for optional authentication"
else
  echo "Found existing .htpasswd file with credentials, preserving authentication settings"
fi

# Ensure .htpasswd file has correct permissions for nginx
if [ -f "$HTPASSWD_FILE" ]; then
  chmod 644 "$HTPASSWD_FILE"
  echo "Set correct permissions on .htpasswd file"
fi

# Ensure .htpasswd is not a directory (remove if it is)
if [ -d "$HTPASSWD_FILE" ]; then
  echo "Removing .htpasswd directory and recreating as file..."
  rm -rf "$HTPASSWD_FILE"
  cat > "$HTPASSWD_FILE" << 'EOF'
# Empty htpasswd file - authentication disabled
# To enable authentication, run: cd deploy/scripts && bash create-htpasswd.sh <username> <password>
# This will replace this file with actual credentials
EOF
fi

# Update nginx config based on .htpasswd file status
echo "Updating nginx configuration for authentication..."
if [ -f "$HTPASSWD_FILE" ] && [ -s "$HTPASSWD_FILE" ] && ! grep -q "^# Empty htpasswd file" "$HTPASSWD_FILE"; then
  echo "Enabling authentication in nginx config..."
  # Add auth directives to nginx config
  sed -i '/^[[:space:]]*location \/ {/a\
        auth_basic "ETHCluj Conference QnA";\
        auth_basic_user_file /etc/nginx/deploy/.htpasswd;' "$APP_DIR/deploy/nginx/default.conf"
else
  echo "Authentication disabled (no valid .htpasswd file)"
fi

# Stop existing containers
section "Stopping existing containers"
docker-compose --env-file "$APP_DIR/.env" -f "${COMPOSE_FILE}" down

# Rebuild containers
section "Rebuilding containers"
docker-compose --env-file "$APP_DIR/.env" -f "${COMPOSE_FILE}" build --no-cache

# Clean up and set up Nginx configuration
section "Setting up Nginx configuration"

# Remove any conflicting Nginx configuration files or directories
echo "Cleaning up any conflicting Nginx configuration..."
if [ -d "${APP_DIR}/deploy/nginx/nginx.prod.conf" ]; then
  echo "Removing nginx.prod.conf directory..."
  rm -rf "${APP_DIR}/deploy/nginx/nginx.prod.conf"
fi

# Create Nginx SSL directory if it doesn't exist and ensure proper permissions
mkdir -p "${APP_DIR}/deploy/nginx/ssl"
chmod 755 "${APP_DIR}/deploy/nginx/ssl"

# Check if valid SSL certificates exist
SSL_AVAILABLE=false
DOMAINS=("app.ethcluj.org" "ethcluj.org" "www.ethcluj.org")

# First check in ${APP_DIR}/certs (where ssl-setup.sh puts them)
if [ -d "${APP_DIR}/certs" ] && 
   [ -f "${APP_DIR}/certs/fullchain.pem" ] && 
   [ -f "${APP_DIR}/certs/privkey.pem" ]; then
  echo "Copying SSL certificates from ${APP_DIR}/certs/..."
  cp "${APP_DIR}/certs/fullchain.pem" "${APP_DIR}/deploy/nginx/ssl/fullchain.pem"
  cp "${APP_DIR}/certs/privkey.pem" "${APP_DIR}/deploy/nginx/ssl/privkey.pem"
  chmod 644 "${APP_DIR}/deploy/nginx/ssl/fullchain.pem" "${APP_DIR}/deploy/nginx/ssl/privkey.pem"
  SSL_AVAILABLE=true
else
  # Check in /etc/letsencrypt for any of the domains
  for domain in "${DOMAINS[@]}"; do
    if [ -d "/etc/letsencrypt/live/${domain}" ] && 
       [ -f "/etc/letsencrypt/live/${domain}/fullchain.pem" ] && 
       [ -f "/etc/letsencrypt/live/${domain}/privkey.pem" ]; then
      echo "Copying SSL certificates from /etc/letsencrypt/live/${domain}/..."
      cp "/etc/letsencrypt/live/${domain}/fullchain.pem" "${APP_DIR}/deploy/nginx/ssl/fullchain.pem"
      cp "/etc/letsencrypt/live/${domain}/privkey.pem" "${APP_DIR}/deploy/nginx/ssl/privkey.pem"
      chmod 644 "${APP_DIR}/deploy/nginx/ssl/fullchain.pem" "${APP_DIR}/deploy/nginx/ssl/privkey.pem"
      SSL_AVAILABLE=true
      break
    fi
  done
  
  if [ "$SSL_AVAILABLE" = false ]; then
    warning "Valid SSL certificates not found for any domain in /etc/letsencrypt/ or ${APP_DIR}/certs/"
    warning "Falling back to HTTP-only mode"
  fi
fi

# Ensure default.conf is a file, not a directory
if [ -d "${APP_DIR}/deploy/nginx/default.conf" ]; then
  echo "Removing default.conf directory..."
  rm -rf "${APP_DIR}/deploy/nginx/default.conf"
fi

# Create the appropriate Nginx configuration based on SSL availability
echo "Creating proper default.conf file..."
if [ "$SSL_AVAILABLE" = true ]; then
  echo "Using HTTPS configuration with SSL..."
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

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # UI
    location / {
        # Authentication is enabled if .htpasswd file contains credentials
        # Empty or missing file disables authentication
        auth_basic "ETHCluj Conference QnA";
        auth_basic_user_file /etc/nginx/deploy/.htpasswd;
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

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
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
else
  echo "Using HTTP-only configuration (no SSL)..."
  cat > "${APP_DIR}/deploy/nginx/default.conf" << 'EOL'
server {
    listen 80;
    server_name app.ethcluj.org;

    # UI
    location / {
        # Authentication is enabled if .htpasswd file contains credentials
        # Empty or missing file disables authentication
        auth_basic "ETHCluj Conference QnA";
        auth_basic_user_file /etc/nginx/deploy/.htpasswd;
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
    listen 80;
    server_name ethcluj.org www.ethcluj.org;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOL
fi

# This section is now handled above in the SSL_AVAILABLE check

# Start containers
section "Starting containers"
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

section "Deployment complete!"
echo "The ETHCluj Conference QnA application has been deployed successfully."
echo "If you encounter any issues, check the logs with: docker-compose -f ${COMPOSE_FILE} logs"

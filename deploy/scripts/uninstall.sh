#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print with color
print_green() { echo -e "${GREEN}$1${NC}"; }
print_yellow() { echo -e "${YELLOW}$1${NC}"; }
print_red() { echo -e "${RED}$1${NC}"; }

# Application directory
APP_DIR=${APP_DIR:-"/opt/conf-app"}
BACKUP_DIR="$APP_DIR/backups"
DOMAIN="qna.ethcluj.org"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

print_red "WARNING: This will completely remove the ETHCluj Conference QnA application."
print_red "All configuration and application data will be lost!"
print_yellow "Database backups in $BACKUP_DIR will be preserved."
read -p "Are you sure you want to continue? (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  print_green "Uninstall cancelled."
  exit 0
fi

# Create final backup before removal
FINAL_BACKUP="$BACKUP_DIR/final_backup_$(date +%Y%m%d_%H%M%S).sql"
print_yellow "Creating final database backup at $FINAL_BACKUP"

# Try to backup the database if containers are running
if docker ps | grep -q "db"; then
  docker exec $(docker ps -qf "name=db") pg_dump -U postgres value_db > $FINAL_BACKUP 2>/dev/null && \
    print_green "Final backup created successfully." || \
    print_red "Warning: Could not create final backup. Continuing with uninstall..."
else
  print_yellow "Database container not running. Skipping final backup."
fi

# Stop and remove containers
print_yellow "Stopping and removing Docker containers..."
cd $APP_DIR
if [ -f "deploy/docker-compose.prod.yml" ]; then
  docker-compose -f deploy/docker-compose.prod.yml down -v || true
fi

# Remove Docker images
print_yellow "Removing Docker images..."
docker image rm -f $(docker images -q 'ethcluj/*') 2>/dev/null || true

# Remove cron jobs
print_yellow "Removing cron jobs..."
(crontab -l 2>/dev/null | grep -v "renew-ssl.sh") | crontab - || true

# Remove SSL certificates
print_yellow "Removing SSL certificates..."
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  sudo rm -rf /etc/letsencrypt/live/$DOMAIN || true
  sudo rm -rf /etc/letsencrypt/archive/$DOMAIN || true
  sudo rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf || true
  print_green "SSL certificates removed."
else
  print_yellow "No SSL certificates found for $DOMAIN."
fi

# Move backups to a safe location
BACKUP_PRESERVE_DIR="/root/ethcluj_backups"
print_yellow "Moving database backups to $BACKUP_PRESERVE_DIR for preservation..."
sudo mkdir -p $BACKUP_PRESERVE_DIR
sudo cp -r $BACKUP_DIR/* $BACKUP_PRESERVE_DIR/ 2>/dev/null || true
sudo chown -R root:root $BACKUP_PRESERVE_DIR

# Remove application files but preserve backups
print_yellow "Removing application files (except backups)..."
find $APP_DIR -path $BACKUP_DIR -prune -o -exec rm -rf {} \; 2>/dev/null || true

print_green "==========================================================="
print_green "Uninstall complete!"
print_green "Database backups have been preserved at: $BACKUP_PRESERVE_DIR"
print_green "You may want to download these backups before decommissioning the server."
print_green "==========================================================="
print_yellow "To download backups from your local machine:"
print_yellow "scp -r user@your-server:$BACKUP_PRESERVE_DIR /local/backup/path"

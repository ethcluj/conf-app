# ETHCluj Conference App Deployment Automation

This document outlines strategies for automating the deployment of the ETHCluj conference application to minimize manual steps when setting up on a new server.

## Current Manual Steps

Below is a comprehensive list of commands executed during the deployment process, from initial server setup to final application deployment:

### 1. Initial Server Setup

```bash
# Login as root initially
ssh root@YOUR_SERVER_IP

# Update system packages
apt update && apt upgrade -y

# Create deploy user
adduser deploy
# Follow prompts to set password

# Add deploy user to sudo group
usermod -aG sudo deploy

# Switch to deploy user
su - deploy

# Create .ssh directory for SSH keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Create authorized_keys file
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Add your public key to authorized_keys
echo "ssh-rsa YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Exit to root user
exit

# Configure SSH to disable password authentication
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config

# Restart SSH service
systemctl restart sshd

# Install Docker
apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt update
apt install -y docker-ce

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add deploy user to docker group
usermod -aG docker deploy

# Configure firewall
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. Application Deployment Setup

```bash
# Login as deploy user
ssh deploy@YOUR_SERVER_IP

# Create application directory
sudo mkdir -p /opt/conf-app
sudo chown deploy:deploy /opt/conf-app
cd /opt/conf-app

# Clone the repository
git clone https://github.com/ethcluj/conf-app.git .

# Create .env file with environment variables
cat > .env << EOF
DB_PASSWORD=your_secure_password
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SHEET_NAME=APP
GOOGLE_SPEAKERS_SHEET_NAME=Speakers
GOOGLE_API_KEY=your_api_key
DATA_SOURCE=google-sheet
EOF
```

### 3. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot certonly --standalone -d app.ethcluj.org

# Create directory for certificates in the app directory
sudo mkdir -p /opt/conf-app/certs

# Copy SSL certificates to app directory
sudo cp /etc/letsencrypt/live/app.ethcluj.org/fullchain.pem /opt/conf-app/certs/
sudo cp /etc/letsencrypt/live/app.ethcluj.org/privkey.pem /opt/conf-app/certs/

# Set appropriate permissions
sudo chmod 644 /opt/conf-app/certs/fullchain.pem
sudo chmod 644 /opt/conf-app/certs/privkey.pem
sudo chown deploy:deploy /opt/conf-app/certs/fullchain.pem
sudo chown deploy:deploy /opt/conf-app/certs/privkey.pem

# Create SSL renewal script
cat > /opt/conf-app/renew-ssl.sh << 'EOF'
#!/bin/bash
# Renew SSL certificates
certbot renew --quiet

# Copy the renewed certificates to the app directory
cp /etc/letsencrypt/live/app.ethcluj.org/fullchain.pem /opt/conf-app/certs/
cp /etc/letsencrypt/live/app.ethcluj.org/privkey.pem /opt/conf-app/certs/

# Set appropriate permissions
chmod 644 /opt/conf-app/certs/fullchain.pem
chmod 644 /opt/conf-app/certs/privkey.pem
chown deploy:deploy /opt/conf-app/certs/fullchain.pem
chown deploy:deploy /opt/conf-app/certs/privkey.pem

# Restart Nginx container to pick up new certificates
cd /opt/conf-app
docker-compose -f docker-compose.prod.yml restart nginx

# Log the renewal attempt
echo "Certificate renewal attempted at $(date)" >> /opt/conf-app/ssl-renewal.log
EOF

# Make the script executable
chmod +x /opt/conf-app/renew-ssl.sh

# Add a cron job to run the renewal script twice a day
(crontab -l 2>/dev/null; echo "0 3,15 * * * /opt/conf-app/renew-ssl.sh") | crontab -
```

### 4. Nginx Configuration

```bash
# Create Nginx production configuration
cat > /opt/conf-app/nginx/nginx.prod.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    upstream ui {
        server ui:3000;
    }
    upstream backend {
        server backend:3001;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name app.ethcluj.org;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl;
        server_name app.ethcluj.org;

        ssl_certificate /certs/fullchain.pem;
        ssl_certificate_key /certs/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
        
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        location / {
            proxy_pass http://ui;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /api {
            rewrite ^/api/(.*) /$1 break;
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
EOF
```

### 5. Docker Compose Production Configuration

```bash
# Create production Docker Compose file
cat > /opt/conf-app/docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  ui:
    build:
      context: ./ui
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
    depends_on:
      backend:
        condition: service_healthy

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - DB_USER=postgres
      - DB_HOST=db
      - DB_NAME=value_db
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_PORT=5432
      - DATA_SOURCE=google-sheet
      - GOOGLE_SHEET_ID=${GOOGLE_SHEET_ID}
      - GOOGLE_SHEET_NAME=${GOOGLE_SHEET_NAME}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - GOOGLE_SPEAKERS_SHEET_NAME=${GOOGLE_SPEAKERS_SHEET_NAME}
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:3001/value"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:15
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=value_db
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:1.25
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/certs:ro
    depends_on:
      backend:
        condition: service_healthy

volumes:
  postgres_data:
EOF
```

### 6. Application Deployment

```bash
# Build and start the application
cd /opt/conf-app
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check logs if needed
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 7. DNS Configuration

```
# Add A record in your DNS provider's control panel
# Type: A
# Name: app
# Value: YOUR_SERVER_IP
# TTL: 3600 (or as recommended)
```

### 8. Troubleshooting Commands

```bash
# Check if ports are in use
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Check Nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# View Nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx cat /etc/nginx/nginx.conf

# Check SSL certificate paths
ls -la /opt/conf-app/certs/

# Test HTTP connection
curl -I http://app.ethcluj.org

# Test HTTPS connection
curl -I https://app.ethcluj.org

# Check container logs
docker-compose -f docker-compose.prod.yml logs nginx
docker-compose -f docker-compose.prod.yml logs backend

# Check container environment variables
docker-compose -f docker-compose.prod.yml exec backend env

# Check database connectivity
docker-compose -f docker-compose.prod.yml exec backend ping -c 2 db
```

## Automation Opportunities

1. **Initial Server Provisioning Script**:
   - Create a bash script that automates the initial server setup
   - Install required packages (Docker, Docker Compose, Certbot)
   - Create the `deploy` user with appropriate permissions
   - Set up SSH key authentication
   - Configure firewall rules

2. **Infrastructure as Code (IaC)**:
   - Use Terraform or similar tools to provision the server
   - Define all infrastructure requirements in code
   - Automate DNS record creation

3. **Enhanced CI/CD Workflow**:
   - Expand the workflow to handle first-time setup
   - Include steps for creating necessary directories
   - Add logic for checking if SSL certificates exist and obtaining them if needed
   - Implement proper error handling and rollback mechanisms

4. **Docker Compose Improvements**:
   - Create a more robust production docker-compose file that handles common issues
   - Include health checks with better diagnostics
   - Add volume configurations that handle permissions automatically
   - Implement proper networking with fallbacks

5. **SSL Certificate Automation**:
   - Create a script that handles the entire SSL certificate process
   - Automate certificate renewal and proper permission setting
   - Include validation and testing of certificates

6. **Environment Configuration**:
   - Create a setup wizard for generating the `.env` file
   - Implement secure secrets management
   - Add validation for required environment variables

7. **Monitoring and Self-healing**:
   - Add monitoring for container health
   - Implement automatic recovery for failed containers
   - Set up logging and alerting

8. **Backup and Restore**:
   - Automate database backups
   - Create a restore procedure
   - Implement backup rotation

9. **Documentation**:
   - Create comprehensive documentation for the deployment process
   - Include troubleshooting guides for common issues
   - Add a quick start guide for new deployments

10. **Testing**:
    - Add automated tests for the deployment process
    - Implement smoke tests to verify the deployment
    - Create a staging environment for testing changes

## Next Steps

1. Prioritize the automation opportunities based on frequency of use and complexity
2. Create a roadmap for implementing the automation
3. Start with the most critical items (server provisioning, SSL automation)
4. Develop and test each automation component
5. Document the automated processes

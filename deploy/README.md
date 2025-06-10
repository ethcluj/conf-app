# ETHCluj Conference QnA Application Deployment

This directory contains all the necessary files and scripts for deploying the ETHCluj Conference QnA application to a production environment.

## Directory Structure

```
deploy/
├── docker-compose.prod.yml   # Production Docker Compose configuration
├── nginx/
│   └── nginx.prod.conf       # Nginx production configuration
├── scripts/
│   ├── deploy.sh             # Main deployment script
│   ├── recovery.sh           # Recovery script for disaster recovery
│   ├── renew-ssl.sh          # SSL certificate renewal script
│   ├── server-init.sh        # Server initialization script
│   ├── ssl-setup.sh          # SSL certificate setup script
│   └── uninstall.sh          # Complete application removal script
└── README.md                 # This file
```

## Initial Server Setup

To set up a new server for the ETHCluj Conference QnA application:

1. SSH into the server as root
2. Clone the repository: `git clone https://github.com/ethcluj/conf-app.git /opt/conf-app`
3. Run the server initialization script: `bash /opt/conf-app/deploy/scripts/server-init.sh`
4. Follow the prompts to complete the server setup

## SSL Certificate Setup

To set up SSL certificates for HTTPS:

1. SSH into the server as the deploy user
2. Run the SSL setup script: `sudo /opt/conf-app/deploy/scripts/ssl-setup.sh`
3. Follow the prompts to complete the SSL certificate setup

## Deployment

To deploy the application:

1. SSH into the server as the deploy user
2. Navigate to the application directory: `cd /opt/conf-app`
3. Run the deployment script: `bash deploy/scripts/deploy.sh`

## Environment Variables

The application requires the following environment variables to be set in a `.env` file in the root directory:

```
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=value_db
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM="ETHCluj Conference <noreply@ethcluj.org>"

# Google Sheets Integration
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_SHEET_NAME=APP
GOOGLE_SPEAKERS_SHEET_NAME=SPEAKERS
```

## Disaster Recovery

In case of deployment issues:

1. SSH into the server as the deploy user
2. Navigate to the application directory: `cd /opt/conf-app`
3. Run the recovery script: `bash deploy/scripts/recovery.sh`

## Continuous Integration/Continuous Deployment

The application uses GitHub Actions for CI/CD. The workflow is defined in `.github/workflows/deploy.yml`.

When code is pushed to the `main` branch, it is automatically deployed to the production server.

## Maintenance

### SSL Certificate Renewal

SSL certificates are automatically renewed by a cron job that runs the `renew-ssl.sh` script.

To manually renew the certificates:

1. SSH into the server as the deploy user
2. Run the renewal script: `sudo /opt/conf-app/deploy/scripts/renew-ssl.sh`

### Database Backups

Database backups are created automatically during deployment and recovery operations.

Backups are stored in the `/opt/conf-app/backups` directory with timestamps in the filename format `postgres_backup_YYYYMMDD_HHMMSS.sql`.

**Important**: Database backups are not automatically deleted and should be managed manually to prevent disk space issues. Consider implementing a rotation policy or periodically removing old backups that are no longer needed.

To manually delete old backups:

```bash
# List all backups sorted by date
ls -lt /opt/conf-app/backups

# Delete backups older than 30 days
find /opt/conf-app/backups -name "postgres_backup_*.sql" -type f -mtime +30 -delete
```

## Troubleshooting

### Checking Logs

To check the logs of the application:

```bash
cd /opt/conf-app
docker-compose -f deploy/docker-compose.prod.yml logs
```

To check the logs of a specific service:

```bash
docker-compose -f deploy/docker-compose.prod.yml logs backend
```

### Container Management

To restart the containers:

```bash
cd /opt/conf-app
docker-compose -f deploy/docker-compose.prod.yml restart
```

To stop the containers:

```bash
cd /opt/conf-app
docker-compose -f deploy/docker-compose.prod.yml down
```

To start the containers:

```bash
cd /opt/conf-app
docker-compose -f deploy/docker-compose.prod.yml up -d
```

## Uninstalling the Application

If you need to completely remove the application from the server, use the uninstall script:

```bash
cd /opt/conf-app
bash deploy/scripts/uninstall.sh
```

**Important Notes:**
- The uninstall script will prompt for confirmation before proceeding
- Database backups will be preserved and moved to `/root/ethcluj_backups`
- All Docker containers, images, and application files will be removed
- SSL certificates for the domain will be removed
- Cron jobs related to the application will be removed

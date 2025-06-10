#!/bin/bash
# ETHCluj Conference QnA Application Server Initialization Script

# Configuration
DEPLOY_USER="deploy"
APP_DIR="/opt/${DEPLOY_USER}/conf-app"
REPO_URL="https://github.com/ethcluj/conf-app.git"
SSH_PORT=22

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

# Update system packages
section "Updating system packages"
apt-get update
apt-get upgrade -y

# Install required packages
section "Installing required packages"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    certbot

# Create deploy user
section "Creating deploy user"
if id "${DEPLOY_USER}" &>/dev/null; then
    warning "User ${DEPLOY_USER} already exists"
else
    echo "Creating user ${DEPLOY_USER}..."
    useradd -m -s /bin/bash "${DEPLOY_USER}"
    
    # Add to sudo group
    usermod -aG sudo "${DEPLOY_USER}"
    
    # Set up password-less sudo for specific commands
    echo "${DEPLOY_USER} ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /usr/bin/certbot" > "/etc/sudoers.d/${DEPLOY_USER}"
    chmod 0440 "/etc/sudoers.d/${DEPLOY_USER}"
fi

# Set up SSH key authentication
section "Setting up SSH key authentication"
mkdir -p "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 700 "/home/${DEPLOY_USER}/.ssh"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"

echo "Please paste your SSH public key (or press Ctrl+D to skip):"
while IFS= read -r line || [[ -n "$line" ]]; do
    echo "$line" >> "/home/${DEPLOY_USER}/.ssh/authorized_keys"
done

# Configure firewall
section "Configuring firewall"
ufw allow "${SSH_PORT}/tcp" comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable

# Install Docker
section "Installing Docker"
if command -v docker &> /dev/null; then
    warning "Docker is already installed"
else
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker "${DEPLOY_USER}"
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
section "Installing Docker Compose"
if command -v docker-compose &> /dev/null; then
    warning "Docker Compose is already installed"
else
    echo "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
fi

# Create application directory
section "Creating application directory"
mkdir -p "${APP_DIR}"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "/opt/${DEPLOY_USER}"

# Clone repository
section "Cloning repository"
if [ -d "${APP_DIR}/.git" ]; then
    warning "Repository already exists at ${APP_DIR}"
else
    echo "Cloning repository to ${APP_DIR}..."
    su - "${DEPLOY_USER}" -c "git clone ${REPO_URL} ${APP_DIR}"
fi

# Set up fail2ban
section "Setting up fail2ban"
systemctl enable fail2ban
systemctl start fail2ban

section "Server initialization complete!"
echo "The server has been initialized successfully."
echo "Next steps:"
echo "1. Log in as the deploy user: su - ${DEPLOY_USER}"
echo "2. Navigate to the application directory: cd ${APP_DIR}"
echo "3. Set up SSL certificates: sudo ./deploy/scripts/ssl-setup.sh"
echo "4. Create the .env file: cp deploy/.env.example .env && nano .env"
echo "5. Deploy the application: ./deploy/scripts/deploy.sh"

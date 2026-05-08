#!/bin/bash

# Script to create HTTP basic authentication password file
# Usage: bash create-htpasswd.sh <username> <password>

if [ $# -ne 2 ]; then
    echo "Usage: $0 <username> <password>"
    echo "Example: $0 admin mypassword123"
    exit 1
fi

USERNAME=$1
PASSWORD=$2

# Check if htpasswd command is available
if ! command -v htpasswd &> /dev/null; then
    echo "Error: htpasswd command not found. Install apache2-utils:"
    echo "  Ubuntu/Debian: sudo apt-get install apache2-utils"
    echo "  CentOS/RHEL: sudo yum install httpd-tools"
    exit 1
fi

# Create .htpasswd file in the deploy directory
htpasswd -bc ../.htpasswd "$USERNAME" "$PASSWORD"

echo "Created .htpasswd file with user: $USERNAME"
echo "File location: $(cd .. && pwd)/.htpasswd"
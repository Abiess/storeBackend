#!/bin/bash

# VPS Preparation Script for GitHub Actions Deployment
# This script automates the setup of your VPS for automated deployments
# Run this on your VPS first: bash vps-prepare.sh

set -e

echo "🚀 Starting VPS Preparation for GitHub Actions Deployment..."
echo "=================================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo -e "${RED}❌ Please do NOT run this script as root${NC}"
   echo "Run it as a regular user (you will be prompted for sudo when needed)"
   exit 1
fi

echo -e "${YELLOW}📋 Step 1: Update System${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}📋 Step 2: Install Required Packages${NC}"
sudo apt install -y openjdk-17-jre-headless postgresql postgresql-contrib curl

echo -e "${YELLOW}📋 Step 3: Create PostgreSQL User and Database${NC}"
# Note: This assumes you want the same credentials. Modify if needed.
DB_USER="storeuser"
DB_NAME="storedb"

# Check if user exists
if sudo -u postgres psql -U postgres -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1; then
    echo "PostgreSQL user '$DB_USER' already exists"
else
    echo "Creating PostgreSQL user '$DB_USER'..."
    # Generate a random password
    DB_PASSWORD=$(openssl rand -base64 32)

    sudo -u postgres psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -U postgres -c "ALTER ROLE $DB_USER CREATEDB;"

    echo -e "${GREEN}✅ PostgreSQL user created${NC}"
    echo -e "${YELLOW}Save this password: $DB_PASSWORD${NC}"
    echo "$DB_PASSWORD" > ~/postgres-password.txt
    chmod 600 ~/postgres-password.txt
    echo "Password saved to ~/postgres-password.txt (keep this secure!)"
fi

# Check if database exists
if sudo -u postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
    echo "PostgreSQL database '$DB_NAME' already exists"
else
    echo "Creating PostgreSQL database '$DB_NAME'..."
    sudo -u postgres psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo -e "${GREEN}✅ PostgreSQL database created${NC}"
fi

echo -e "${YELLOW}📋 Step 4: Create Deploy User${NC}"

if id -u deploy > /dev/null 2>&1; then
    echo "User 'deploy' already exists"
else
    echo "Creating 'deploy' user..."
    sudo useradd -m -s /bin/bash deploy
    echo -e "${GREEN}✅ Deploy user created${NC}"
fi

# Add deploy to sudoers
sudo usermod -aG sudo deploy 2>/dev/null || true

# Configure sudoers for passwordless sudo
if sudo grep -q "deploy ALL=(ALL) NOPASSWD: ALL" /etc/sudoers; then
    echo "Deploy user already has passwordless sudo"
else
    echo "Adding passwordless sudo for deploy user..."
    echo "deploy ALL=(ALL) NOPASSWD: ALL" | sudo tee -a /etc/sudoers > /dev/null
    echo -e "${GREEN}✅ Passwordless sudo configured${NC}"
fi

echo -e "${YELLOW}📋 Step 5: Setup Application Directories${NC}"

sudo mkdir -p /opt/storebackend/backups
sudo mkdir -p /opt/storebackend/logs
sudo useradd -r -s /bin/bash storebackend 2>/dev/null || true
sudo chown -R storebackend:storebackend /opt/storebackend
sudo chmod 755 /opt/storebackend
sudo chmod 755 /opt/storebackend/backups

echo -e "${GREEN}✅ Application directories created${NC}"

echo -e "${YELLOW}📋 Step 6: Create Environment Configuration${NC}"

# Read password from file if available, or ask user
if [ -f ~/postgres-password.txt ]; then
    DB_PASS=$(cat ~/postgres-password.txt)
else
    read -p "Enter PostgreSQL password for $DB_USER: " DB_PASS
fi

# Generate JWT secret
JWT_SECRET=$(openssl rand -hex 32)

# Create .env file
sudo tee /opt/storebackend/.env > /dev/null <<EOF
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/$DB_NAME
SPRING_DATASOURCE_USERNAME=$DB_USER
SPRING_DATASOURCE_PASSWORD=$DB_PASS
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect
JWT_SECRET=$JWT_SECRET
SERVER_PORT=8080
EOF

sudo chown storebackend:storebackend /opt/storebackend/.env
sudo chmod 600 /opt/storebackend/.env

echo -e "${GREEN}✅ Environment configuration created${NC}"

echo -e "${YELLOW}📋 Step 7: Create Systemd Service${NC}"

sudo tee /etc/systemd/system/storebackend.service > /dev/null <<'EOF'
[Unit]
Description=Store Backend Application
After=network.target postgresql.service

[Service]
Type=simple
User=storebackend
WorkingDirectory=/opt/storebackend
EnvironmentFile=/opt/storebackend/.env
ExecStart=/usr/bin/java -jar /opt/storebackend/app.jar
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable storebackend

echo -e "${GREEN}✅ Systemd service created and enabled${NC}"

echo -e "${YELLOW}📋 Step 8: Setup SSH Directory for Deploy User${NC}"

sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy chmod 700 /home/deploy/.ssh
sudo -u deploy touch /home/deploy/.ssh/authorized_keys
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys

echo -e "${GREEN}✅ SSH directory configured${NC}"

echo ""
echo "=================================================="
echo -e "${GREEN}✅ VPS Preparation Complete!${NC}"
echo "=================================================="
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Generate SSH key on your LOCAL machine (NOT on VPS):"
echo "   ssh-keygen -t ed25519 -C 'github-actions' -f ~/.ssh/github-actions -N ''"
echo ""
echo "2️⃣  Add SSH key to deploy user on VPS:"
echo "   ssh-copy-id -i ~/.ssh/github-actions.pub deploy@YOUR-VPS-IP"
echo ""
echo "3️⃣  Get your private key for GitHub Secrets:"
echo "   cat ~/.ssh/github-actions"
echo ""
echo "4️⃣  Add these secrets to GitHub (Settings → Secrets):"
echo "   - VPS_HOST: Your VPS IP address"
echo "   - VPS_USER: deploy"
echo "   - VPS_PORT: 22"
echo "   - VPS_SSH_KEY: Content of ~/.ssh/github-actions (private key)"
echo "   - DB_PASSWORD: $DB_PASS"
echo "   - JWT_SECRET: $JWT_SECRET"
echo ""
echo "5️⃣  Test SSH connection:"
echo "   ssh -i ~/.ssh/github-actions deploy@YOUR-VPS-IP"
echo ""
echo "6️⃣  Push code to GitHub and watch the deployment!"
echo ""
echo "📁 Important files created:"
echo "   - /opt/storebackend/.env (environment configuration)"
echo "   - /etc/systemd/system/storebackend.service (systemd service)"
echo "   - ~/postgres-password.txt (PostgreSQL password - keep secure!)"
echo ""
echo -e "${YELLOW}💡 Make sure to save these values in GitHub Secrets!${NC}"
echo ""


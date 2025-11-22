# GitHub Actions Deployment Setup Guide

This guide explains how to set up GitHub Actions to automatically deploy your Spring Boot backend to your VPS.

## Overview

The GitHub Actions workflow will:
1. ✅ Build the backend with Maven (creates JAR file)
2. 📦 Transfer the JAR to VPS `/tmp/app.jar`
3. 📋 Transfer the deploy script to VPS
4. 🔧 Setup VPS environment (directories, user, permissions)
5. 🚀 Execute the deployment script
6. 🏥 Verify application health

## Prerequisites

### On Your VPS

Before setting up GitHub Actions, you need to prepare your VPS:

#### 1. Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Java 17
sudo apt install -y openjdk-17-jre-headless

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install curl (for health checks)
sudo apt install -y curl
```

#### 2. Create PostgreSQL User and Database
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell, run:
CREATE USER storeuser WITH PASSWORD 'your-secure-password';
ALTER ROLE storeuser CREATEDB;
CREATE DATABASE storedb OWNER storeuser;

# Exit PostgreSQL
\q
```

#### 3. Configure Database Connection
Create a systemd service configuration. First, create the environment file:

```bash
sudo mkdir -p /opt/storebackend
sudo nano /opt/storebackend/.env
```

Add these variables:
```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/storedb
SPRING_DATASOURCE_USERNAME=storeuser
SPRING_DATASOURCE_PASSWORD=your-secure-password
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect
SERVER_PORT=8080
```

#### 4. Create Systemd Service File
```bash
sudo nano /etc/systemd/system/storebackend.service
```

Paste:
```ini
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

[Install]
WantedBy=multi-user.target
```

Save and enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable storebackend
```

#### 5. Create Required Directories and User
```bash
# Create application directory
sudo mkdir -p /opt/storebackend/backups
sudo mkdir -p /opt/storebackend/logs

# Create storebackend user (system user for running the service)
sudo useradd -r -s /bin/bash storebackend 2>/dev/null || true

# Set permissions
sudo chown -R storebackend:storebackend /opt/storebackend
sudo chmod 755 /opt/storebackend
sudo chmod 755 /opt/storebackend/backups
```

#### 6. Configure SSH for GitHub Actions

Create a `deploy` user for GitHub Actions deployments:

```bash
# Create deploy user
sudo useradd -m -s /bin/bash deploy

# Add to sudoers (allow commands without password)
sudo usermod -aG sudo deploy
```

Generate SSH key pair for GitHub Actions on your local machine:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github-actions -N ""
```

Add the public key to VPS:
```bash
# On your VPS as deploy user
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Then add the public key content to authorized_keys
nano ~/.ssh/authorized_keys
# Paste the content of ~/.ssh/github-actions.pub

chmod 600 ~/.ssh/authorized_keys
```

Configure sudo for passwordless execution:
```bash
sudo visudo
```

Add this line at the end:
```bash
deploy ALL=(ALL) NOPASSWD: ALL
```

### On GitHub

#### 1. Add Repository Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Value | Example |
|---|---|---|
| `VPS_HOST` | Your VPS IP address | `123.456.789.10` |
| `VPS_USER` | SSH user (deploy) | `deploy` |
| `VPS_PORT` | SSH port | `22` |
| `VPS_SSH_KEY` | Your private SSH key | Content of `~/.ssh/github-actions` |
| `DB_PASSWORD` | PostgreSQL password | `your-secure-password` |
| `JWT_SECRET` | Your JWT secret | Any secure string |

#### 2. Copy SSH Private Key to GitHub

```bash
# Display and copy the private key
cat ~/.ssh/github-actions
```

Go to GitHub → Settings → Secrets and add new secret `VPS_SSH_KEY` with the private key content.

## VPS SSH Key Setup in Detail

```bash
# On your local machine, generate SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/github-actions.pub deploy@your-vps-ip

# Test connection
ssh -i ~/.ssh/github-actions deploy@your-vps-ip

# Get private key content for GitHub (use this for VPS_SSH_KEY secret)
cat ~/.ssh/github-actions
```

## How It Works

1. **On Push**: Every push to `main` or `master` triggers the workflow
2. **Build**: Maven builds the application into `target/app.jar`
3. **Transfer**: SCP copies `app.jar` and deploy script to VPS
4. **Setup**: VPS environment is verified/created
5. **Deploy**: The `deploy.sh` script runs:
   - Stops old service
   - Backs up previous JAR
   - Sets up database
   - Starts new service
   - Performs health checks
6. **Verify**: GitHub Actions confirms the deployment succeeded

## Deployment Process (deploy.sh)

The `scripts/deploy.sh` script handles:

1. **Stop Old Service**: `sudo systemctl stop storebackend`
2. **Backup**: Saves previous JAR to `/opt/storebackend/backups/`
3. **Database Setup**: Creates PostgreSQL database if needed
4. **Install JAR**: Moves new JAR to `/opt/storebackend/app.jar`
5. **Start Service**: `sudo systemctl start storebackend`
6. **Health Check**: Waits up to 60 seconds for health endpoint
7. **Rollback**: If health check fails, reverts to previous version

## Testing Locally

To test the deployment script locally on your VPS:

```bash
# Manually test the script
cd /opt/storebackend
./deploy.sh

# Check service status
sudo systemctl status storebackend

# View logs
sudo journalctl -u storebackend -f
```

## Troubleshooting

### JAR not found in /tmp
- Check if SCP transfer succeeded in GitHub Actions logs
- Verify VPS SSH connectivity
- Check `/tmp/` on VPS for the file

### Service won't start
```bash
# Check service status and logs
sudo systemctl status storebackend -l
sudo journalctl -u storebackend -n 50

# Check if port 8080 is available
sudo lsof -i :8080
```

### Database connection errors
```bash
# Test PostgreSQL connection
sudo -u postgres psql -U storeuser -d storedb -c "SELECT 1;"

# Check database exists
sudo -u postgres psql -l | grep storedb

# Verify environment variables
cat /opt/storebackend/.env
```

### Health check fails
```bash
# Test health endpoint manually
curl -v http://localhost:8080/actuator/health

# Check application logs
sudo journalctl -u storebackend -f | grep -i health
```

## Manual Rollback

If something goes wrong:

```bash
# List available backups
ls -lh /opt/storebackend/backups/

# Restore a previous version
sudo cp /opt/storebackend/backups/app-20240101-120000.jar /opt/storebackend/app.jar

# Restart service
sudo systemctl restart storebackend

# Check status
sudo systemctl status storebackend
```

## Security Best Practices

1. ✅ Keep SSH keys secure (never commit them)
2. ✅ Use GitHub Secrets for all sensitive data
3. ✅ Regularly rotate SSH keys
4. ✅ Use `deploy` user with restricted sudoers
5. ✅ Keep PostgreSQL password strong
6. ✅ Monitor deployment logs
7. ✅ Test deployments in staging first
8. ✅ Set up alerts for failed deployments

## Next Steps

1. Complete VPS setup above
2. Add all secrets to GitHub
3. Push to `main` or `master` branch
4. Monitor deployment in GitHub Actions
5. Check application health at `http://your-vps-ip:8080/actuator/health`


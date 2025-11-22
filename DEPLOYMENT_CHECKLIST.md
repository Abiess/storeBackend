# GitHub Actions Deployment Checklist

## 🚀 Quick Start Checklist

Use this checklist to ensure your deployment is properly configured.

### Step 1: VPS Preparation ✅

- [ ] SSH into VPS and update system
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- [ ] Install Java 17
  ```bash
  sudo apt install -y openjdk-17-jre-headless
  ```

- [ ] Install PostgreSQL
  ```bash
  sudo apt install -y postgresql postgresql-contrib curl
  ```

- [ ] Create PostgreSQL user and database
  ```bash
  sudo -u postgres psql
  # CREATE USER storeuser WITH PASSWORD 'secure-password';
  # ALTER ROLE storeuser CREATEDB;
  # CREATE DATABASE storedb OWNER storeuser;
  # \q
  ```

### Step 2: Create Deployment User ✅

```bash
# Create deploy user
sudo useradd -m -s /bin/bash deploy

# Add to sudoers
sudo usermod -aG sudo deploy

# Configure passwordless sudo
sudo visudo
# Add: deploy ALL=(ALL) NOPASSWD: ALL
```

### Step 3: Setup SSH Authentication ✅

**On your local machine:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""

# Copy to VPS
ssh-copy-id -i ~/.ssh/github-actions.pub deploy@YOUR-VPS-IP

# Test connection
ssh -i ~/.ssh/github-actions deploy@YOUR-VPS-IP
```

### Step 4: Prepare VPS Directories ✅

```bash
sudo mkdir -p /opt/storebackend/backups
sudo mkdir -p /opt/storebackend/logs
sudo useradd -r -s /bin/bash storebackend 2>/dev/null || true
sudo chown -R storebackend:storebackend /opt/storebackend
sudo chmod 755 /opt/storebackend
```

### Step 5: Create .env Configuration ✅

```bash
sudo nano /opt/storebackend/.env
```

Paste:
```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/storedb
SPRING_DATASOURCE_USERNAME=storeuser
SPRING_DATASOURCE_PASSWORD=secure-password
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_DATABASE_PLATFORM=org.hibernate.dialect.PostgreSQLDialect
SERVER_PORT=8080
```

### Step 6: Create Systemd Service ✅

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

Enable:
```bash
sudo systemctl daemon-reload
sudo systemctl enable storebackend
```

### Step 7: GitHub Secrets Setup ✅

In GitHub → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP (e.g., 123.45.67.89) |
| `VPS_USER` | `deploy` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | Content of `~/.ssh/github-actions` (private key) |
| `DB_PASSWORD` | Your PostgreSQL password |
| `JWT_SECRET` | Any secure string |

**How to get the private key:**
```bash
cat ~/.ssh/github-actions
```

### Step 8: Verify Workflow ✅

- [ ] Check workflow file exists: `.github/workflows/deploy.yml`
- [ ] Check deploy script exists: `scripts/deploy.sh`
- [ ] All secrets are set in GitHub
- [ ] Deploy user can SSH to VPS

### Step 9: Test Deployment ✅

1. **Push to main/master branch:**
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```

2. **Monitor in GitHub:**
   - Go to Actions tab
   - Watch the workflow run
   - Check logs for any errors

3. **Verify on VPS:**
   ```bash
   # Check service status
   sudo systemctl status storebackend
   
   # Check logs
   sudo journalctl -u storebackend -f
   
   # Test health endpoint
   curl http://localhost:8080/actuator/health
   ```

## 🔍 Troubleshooting

### Workflow fails at "Deploy to VPS" step
- ✅ Verify `VPS_SSH_KEY` secret is set correctly
- ✅ Verify `VPS_HOST` and `VPS_USER` are correct
- ✅ Test SSH manually: `ssh -i key deploy@host`

### "No app.jar found in /tmp"
- ✅ Check Maven build succeeded
- ✅ Verify JAR exists: `ls -lh target/app.jar`
- ✅ Check SCP transfer in logs

### Service won't start
```bash
# Check what's wrong
sudo systemctl status storebackend -l
sudo journalctl -u storebackend -n 50

# Check port conflict
sudo lsof -i :8080
```

### Database connection failed
```bash
# Test DB connection
psql -U storeuser -d storedb -h localhost

# Check environment variables
cat /opt/storebackend/.env

# Check PostgreSQL is running
sudo systemctl status postgresql
```

## 📋 Deployment Files Modified

- ✅ `.github/workflows/deploy.yml` - Updated with JAR prep and verification
- ✅ `scripts/deploy.sh` - Updated to find any JAR file in /tmp

## 📚 Documentation Files

- 📖 `GITHUB_ACTIONS_SETUP.md` - Detailed setup guide
- 📋 `DEPLOYMENT_CHECKLIST.md` - This file (quick reference)

## 🎯 What Happens on Push

1. **Build** - Maven compiles and packages JAR
2. **Prepare** - JAR renamed to `app.jar`
3. **Transfer** - Files copied to VPS via SCP
4. **Verify** - Check JAR arrived successfully
5. **Setup** - VPS directories and user created/verified
6. **Deploy** - Deploy script runs
7. **Health** - Application health checked
8. **Complete** - Success/failure reported

## 💡 Tips

- ✅ Monitor first few deployments closely
- ✅ Keep GitHub Actions logs for reference
- ✅ Test health endpoint: `curl http://vps-ip:8080/actuator/health`
- ✅ Check app logs: `sudo journalctl -u storebackend -f`
- ✅ Keep backups: `ls /opt/storebackend/backups/`
- ✅ Manually test on VPS before full automation

---

**Need help?** Check `GITHUB_ACTIONS_SETUP.md` for detailed documentation.


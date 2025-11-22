# Automated Deployment Solution - Complete Setup Guide

## 🎯 What Was Fixed

Your deployment was failing with **"❌ No app.jar found in /tmp/"** because:

1. ❌ The Maven build was creating `storeBackend-0.0.1-SNAPSHOT.jar` 
2. ❌ The deploy script expected exactly `app.jar`
3. ❌ VPS wasn't fully prepared with all required components

## ✅ What We Fixed

### 1. Updated Deploy Script (`scripts/deploy.sh`)
- Now searches for ANY `.jar` file in `/tmp/` instead of expecting `app.jar`
- Better error reporting showing available files
- Handles both Maven build names and renamed JAR files

### 2. Updated GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- **New Step**: Renames built JAR to `app.jar` for consistency
- **New Step**: Verifies JAR was transferred to VPS before deployment
- **New Step**: Automatically sets up VPS environment (directories, user, permissions)
- Improved logging for troubleshooting

### 3. Created VPS Automation Script (`scripts/vps-prepare.sh`)
- Automates all VPS setup in one command
- Installs Java, PostgreSQL, creates users
- Sets up systemd service
- Generates secure passwords
- Creates all required directories

## 🚀 Quick Start (5 Minutes)

### Step 1: Prepare Your VPS (5 min)

SSH into your VPS and run:

```bash
# Download and run the preparation script
curl -fsSL https://raw.githubusercontent.com/YOUR-REPO/main/scripts/vps-prepare.sh | bash

# OR manually:
bash ~/vps-prepare.sh
```

This will:
- ✅ Install Java 17, PostgreSQL, curl
- ✅ Create `storeuser` database user
- ✅ Create `deploy` user with SSH access
- ✅ Create `/opt/storebackend` directory
- ✅ Create systemd service
- ✅ Generate secure passwords

### Step 2: Configure GitHub Secrets (2 min)

On your LOCAL machine:

```bash
# Generate SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""

# Display private key (for GitHub)
cat ~/.ssh/github-actions
```

Go to GitHub → Settings → Secrets → Add these:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your VPS IP (e.g., 123.45.67.89) |
| `VPS_USER` | `deploy` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | Content of `~/.ssh/github-actions` |
| `DB_PASSWORD` | From `~/postgres-password.txt` on VPS |
| `JWT_SECRET` | Any long random string |

### Step 3: Add SSH Key to VPS (1 min)

```bash
# On your LOCAL machine
ssh-copy-id -i ~/.ssh/github-actions.pub deploy@YOUR-VPS-IP

# Test it works
ssh -i ~/.ssh/github-actions deploy@YOUR-VPS-IP
```

### Step 4: Deploy!

```bash
# Push to main branch
git add .
git commit -m "Automated deployment ready"
git push origin main
```

Go to GitHub Actions tab and watch it deploy! ✅

## 📁 Files Modified/Created

### Modified Files
- ✅ `.github/workflows/deploy.yml` - Improved workflow with JAR prep and VPS setup
- ✅ `scripts/deploy.sh` - Better JAR file discovery and error handling

### New Files
- 📄 `GITHUB_ACTIONS_SETUP.md` - Detailed setup documentation
- 📄 `DEPLOYMENT_CHECKLIST.md` - Quick reference checklist
- 📄 `scripts/vps-prepare.sh` - Automated VPS preparation script
- 📄 `AUTOMATED_DEPLOYMENT.md` - This file

## 🔍 How It Works Now

```
1. You push to main/master
        ↓
2. GitHub Actions workflow triggers
        ↓
3. Maven builds the application
        ↓
4. JAR is renamed to app.jar
        ↓
5. app.jar is copied to VPS:/tmp/
        ↓
6. deploy.sh script is copied to VPS
        ↓
7. VPS environment is verified/created
        ↓
8. deploy.sh runs:
   - Stops old service
   - Backs up old JAR
   - Sets up database
   - Moves new JAR to /opt/storebackend/app.jar
   - Starts service via systemd
   - Waits for health check
        ↓
9. Health check verifies app is running
        ↓
10. GitHub Actions reports success/failure
        ↓
11. Your app is live! 🎉
```

## ⚙️ What Happens On Each Deployment

### On GitHub Actions:
1. ✅ Checks out code
2. ✅ Sets up Java 17
3. ✅ Builds with Maven
4. ✅ Prepares JAR (rename to app.jar)
5. ✅ Transfers files to VPS
6. ✅ Verifies transfer
7. ✅ Prepares VPS environment
8. ✅ Runs deployment script
9. ✅ Performs health checks

### On VPS (via deploy.sh):
1. ✅ Stops storebackend service
2. ✅ Backs up old JAR with timestamp
3. ✅ Ensures PostgreSQL database exists
4. ✅ Moves new JAR to /opt/storebackend/app.jar
5. ✅ Sets permissions
6. ✅ Starts storebackend service
7. ✅ Waits up to 60 seconds for app to start
8. ✅ Tests health endpoint
9. ✅ Shows status or rolls back if failed

## 🧪 Testing Your Deployment

### Test 1: SSH Connection
```bash
# On your LOCAL machine
ssh -i ~/.ssh/github-actions deploy@YOUR-VPS-IP

# Should work without password
```

### Test 2: Trigger Deployment
```bash
# Make a small change and push
git add .
git commit -m "Test deployment"
git push origin main

# Watch it in GitHub Actions tab
```

### Test 3: Verify on VPS
```bash
# SSH to VPS
ssh -i ~/.ssh/github-actions deploy@YOUR-VPS-IP

# Check service status
sudo systemctl status storebackend

# Check logs
sudo journalctl -u storebackend -f

# Test application
curl http://localhost:8080/actuator/health
```

## 🐛 Troubleshooting

### "No app.jar found in /tmp" (The original error)
- **Now Fixed!** Deploy script searches for any .jar file
- **If it still happens**: Check GitHub Actions logs for SCP transfer errors

### JAR transfer fails in GitHub Actions
```bash
# Check VPS SSH access
ssh -i ~/.ssh/github-actions deploy@YOUR-VPS-IP
ls -la /tmp

# Verify VPS_SSH_KEY secret is exactly your private key
cat ~/.ssh/github-actions | wc -c  # Should be ~400+ characters
```

### Service won't start
```bash
# SSH to VPS
sudo systemctl status storebackend -l

# Check detailed logs
sudo journalctl -u storebackend -n 100

# Check if port is in use
sudo lsof -i :8080

# Check environment variables
cat /opt/storebackend/.env

# Test database connection
psql -U storeuser -d storedb -h localhost -c "SELECT 1;"
```

### Health check fails
```bash
# Test endpoint manually
curl -v http://localhost:8080/actuator/health

# Check application logs
sudo journalctl -u storebackend | grep -i health

# Check if app is actually running
ps aux | grep java
```

### Need to rollback manually
```bash
# List backups
ls -lh /opt/storebackend/backups/

# Restore previous version
sudo cp /opt/storebackend/backups/app-20240115-143000.jar /opt/storebackend/app.jar

# Restart service
sudo systemctl restart storebackend
```

## 📊 Monitoring Your Application

### Check Status
```bash
ssh -i ~/.ssh/github-actions deploy@YOUR-VPS-IP
sudo systemctl status storebackend
```

### View Logs (real-time)
```bash
sudo journalctl -u storebackend -f
```

### View Last 100 lines of logs
```bash
sudo journalctl -u storebackend -n 100
```

### Test Health Endpoint
```bash
curl http://YOUR-VPS-IP:8080/actuator/health
```

### Check Disk Usage
```bash
df -h /opt/storebackend
```

### List Backup Versions
```bash
ls -lh /opt/storebackend/backups/
```

## 🔐 Security Notes

### ✅ Do's:
- ✅ Store SSH private key securely on your machine
- ✅ Use strong passwords for database
- ✅ Rotate SSH keys regularly
- ✅ Keep GitHub Secrets confidential
- ✅ Monitor deployment logs for issues
- ✅ Use the `deploy` user (not root)
- ✅ Keep PostgreSQL password unique

### ❌ Don'ts:
- ❌ Never commit private keys to git
- ❌ Never share SSH private key
- ❌ Never hardcode passwords
- ❌ Never use weak passwords
- ❌ Never run deploy as root
- ❌ Never share GitHub Secrets
- ❌ Never delete backups without testing

## 📚 Additional Documentation

- **Detailed Setup**: See `GITHUB_ACTIONS_SETUP.md`
- **Quick Reference**: See `DEPLOYMENT_CHECKLIST.md`
- **VPS Script**: Run `scripts/vps-prepare.sh` on your VPS

## 🎉 You're All Set!

Your deployment pipeline is now fully automated:

1. ✅ Code is built automatically on push
2. ✅ JAR is transferred securely to VPS
3. ✅ Old version is backed up
4. ✅ New version is deployed
5. ✅ Health checks verify it's working
6. ✅ Automatic rollback if something fails
7. ✅ You can deploy with a single `git push`

## 🚀 Next Steps

1. **Prepare VPS**: Run `vps-prepare.sh`
2. **Setup SSH**: Generate and add SSH key
3. **Add Secrets**: Add all secrets to GitHub
4. **Test**: Make a commit and push
5. **Monitor**: Watch GitHub Actions and VPS logs
6. **Celebrate**: Your automated deployment works! 🎊

---

**Questions?** Check the detailed documentation files or review the GitHub Actions logs for specific error messages.

**Issues?** The deploy script has automatic rollback - if the health check fails, it reverts to the previous version automatically.

Happy deploying! 🚀


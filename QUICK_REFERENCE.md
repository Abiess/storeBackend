# ⚡ Quick Reference Card

## The Problem (FIXED ✅)
```
❌ No app.jar found in /tmp/
```

## The Solution (3 Parts)

### 1️⃣ Deploy Script Fix
Deploy script now searches for ANY `.jar` file instead of expecting exactly `app.jar`

### 2️⃣ GitHub Actions Improvements
- Prepare step: Renames JAR to app.jar for consistency
- Verify step: Checks JAR was transferred successfully
- Setup step: Creates VPS environment automatically

### 3️⃣ VPS Automation
One-command setup: `bash vps-prepare.sh`

---

## 🚀 Get Started in 5 Minutes

### Minute 1-2: Prepare VPS
```bash
ssh deploy@YOUR-VPS-IP
bash vps-prepare.sh
cat ~/postgres-password.txt  # save this
```

### Minute 3: Setup SSH
```bash
# Local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""
ssh-copy-id -i ~/.ssh/github-actions.pub deploy@YOUR-VPS-IP
```

### Minute 4: Add GitHub Secrets
GitHub → Settings → Secrets:
- `VPS_HOST` = Your VPS IP
- `VPS_USER` = deploy
- `VPS_PORT` = 22
- `VPS_SSH_KEY` = Content of `~/.ssh/github-actions`
- `DB_PASSWORD` = From postgres-password.txt
- `JWT_SECRET` = `openssl rand -hex 32`

### Minute 5: Deploy!
```bash
git push origin main
# Watch GitHub Actions tab ✅
```

---

## 📋 File Changes

| File | Change | Why |
|------|--------|-----|
| `.github/workflows/deploy.yml` | Added 3 new verification steps | Better error detection |
| `scripts/deploy.sh` | JAR search flexibility | Handle any JAR filename |
| `scripts/vps-prepare.sh` | NEW - Automated setup | One command to setup VPS |

---

## 🧪 Test It

```bash
# SSH to VPS and check status
ssh deploy@YOUR-VPS-IP
sudo systemctl status storebackend

# Test health endpoint
curl http://localhost:8080/actuator/health

# View logs
sudo journalctl -u storebackend -f
```

---

## ❌ Troubleshooting

| Error | Fix |
|-------|-----|
| Auth failed | Check VPS_SSH_KEY is your private key |
| JAR not found | Check GitHub Actions log for SCP error |
| Service won't start | Check logs: `journalctl -u storebackend -n 50` |
| DB connection error | Verify DB_PASSWORD, check PostgreSQL running |

---

## 📚 Documentation

- 📖 `AUTOMATED_DEPLOYMENT.md` - Overview (5 min)
- 📋 `DEPLOYMENT_CHECKLIST.md` - Step by step
- 🔐 `GITHUB_SECRETS_SETUP.md` - Secrets config
- 🔧 `GITHUB_ACTIONS_SETUP.md` - Deep dive
- 📝 `DEPLOYMENT_FIX_SUMMARY.md` - Technical summary

---

## 🔐 Security Reminders

✅ DO:
- Keep SSH private key secure
- Use GitHub Secrets for passwords
- Rotate keys regularly

❌ DON'T:
- Commit keys to git
- Share GitHub Secrets
- Use weak passwords

---

## 🎯 What Happens on Push

1. ✅ Maven builds JAR
2. ✅ JAR renamed to app.jar
3. ✅ Files transferred to VPS
4. ✅ VPS environment prepared
5. ✅ Deployment script runs
6. ✅ Health checks pass
7. ✅ App is live! 🚀

---

## 📞 Help

**GitHub Actions failing?** → Check `.github/workflows/deploy.yml` logs

**VPS setup issues?** → Run `bash vps-prepare.sh` with `-x` flag for debug

**SSH connection error?** → Run `ssh -vv -i ~/.ssh/github-actions deploy@YOUR-VPS-IP`

**App not starting?** → Check logs: `sudo journalctl -u storebackend -n 100`

---

**Ready?** `git push origin main` and watch the magic! ✨


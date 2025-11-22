# GitHub Secrets Configuration Examples

This file shows example values for all GitHub Secrets you need to set up.

## Required Secrets

Add these to GitHub → Settings → Secrets and variables → Actions

### 1. VPS_HOST
**Description**: The IP address or hostname of your VPS

```
Example: 123.45.67.89
Or: my-vps.example.com
```

### 2. VPS_USER
**Description**: The SSH user for deployments (created by vps-prepare.sh)

```
Example: deploy
```

### 3. VPS_PORT
**Description**: SSH port on your VPS (usually 22, might be different if you changed it)

```
Example: 22
```

### 4. VPS_SSH_KEY
**Description**: Your private SSH key for GitHub Actions to connect to VPS

**⚠️ IMPORTANT: This is your PRIVATE key, not public key!**

Generate on your LOCAL machine:
```bash
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""
cat ~/.ssh/github-actions
# Copy the entire output (including -----BEGIN and -----END lines)
```

The file content should look like:
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUtbm9uZS1ub25lAAAAAA...
(many lines of characters)
-----END OPENSSH PRIVATE KEY-----
```

**Never share this key!** Keep it secret.

### 5. DB_PASSWORD
**Description**: PostgreSQL password for storeuser

After running vps-prepare.sh, the password is saved to ~/postgres-password.txt on your VPS:

```bash
# SSH to your VPS and get the password
ssh deploy@YOUR-VPS-IP
cat ~/postgres-password.txt
```

Or generate a new one:
```bash
openssl rand -base64 32
```

Example output:
```
a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u
```

### 6. JWT_SECRET
**Description**: Secret key for JWT token signing

Generate a secure random string:
```bash
openssl rand -hex 32
```

Example output:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

## How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** (top right)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. For each secret:
   - **Name**: Enter the name (e.g., `VPS_HOST`)
   - **Secret**: Enter the value
   - Click **Add secret**

Example flow:
```
VPS_HOST
123.45.67.89
[Add secret]
```

## Verifying Secrets Are Set

After adding all secrets, you should see:

```
✓ VPS_HOST
✓ VPS_USER
✓ VPS_PORT
✓ VPS_SSH_KEY
✓ DB_PASSWORD
✓ JWT_SECRET
```

## Testing Your Secrets

Make sure all secrets are correct by testing the connection:

```bash
# On your LOCAL machine
ssh -i ~/.ssh/github-actions deploy@YOUR-VPS-IP

# Should connect without password
# Then exit
exit
```

## Troubleshooting Secrets

### Error: "Authentication failed"
- ✅ Check `VPS_SSH_KEY` is your PRIVATE key (not public!)
- ✅ Check `VPS_HOST` is correct
- ✅ Check `VPS_USER` is "deploy"
- ✅ Check SSH key was added to VPS: `ssh-copy-id -i ~/.ssh/github-actions.pub deploy@YOUR-VPS-IP`

### Error: "No such file or directory"
- ✅ Check `VPS_HOST` is reachable
- ✅ Check `VPS_PORT` is correct
- ✅ Check VPS firewall allows SSH (port 22 by default)

### Error: "Database connection failed"
- ✅ Check `DB_PASSWORD` is correct
- ✅ Check PostgreSQL is running on VPS: `sudo systemctl status postgresql`
- ✅ Check database was created: `sudo -u postgres psql -l | grep storedb`

## Updating Secrets

If you need to change a secret:

1. Go to GitHub Settings → Secrets and variables → Actions
2. Click the secret name (e.g., `VPS_HOST`)
3. Click **Update secret**
4. Enter the new value
5. Click **Update secret**

## Security Best Practices

✅ **DO:**
- Use strong passwords (20+ characters)
- Rotate SSH keys regularly
- Keep GitHub logged out when not using
- Monitor GitHub Actions logs
- Delete old/unused secrets
- Use unique passwords for each environment

❌ **DON'T:**
- Share GitHub Secrets with anyone
- Commit secrets to git
- Use simple passwords
- Reuse secrets across projects
- Store secrets in environment files
- Share your private SSH key

## Common Issues

### SSH Key Format
If you see errors about key format, make sure you're using ed25519:

```bash
# Wrong (RSA - old format)
ssh-keygen -t rsa -f ~/.ssh/id_rsa

# Correct (ed25519 - modern format)
ssh-keygen -t ed25519 -f ~/.ssh/github-actions
```

### Multiline Secret
For `VPS_SSH_KEY`, paste the ENTIRE key including:
- `-----BEGIN OPENSSH PRIVATE KEY-----`
- All lines in the middle
- `-----END OPENSSH PRIVATE KEY-----`

GitHub will handle the newlines correctly.

### Special Characters
If your password contains special characters, GitHub will handle them correctly. No need to escape.

Example: `a!@#$%^&*()_+-=[]{}|;:',.<>?/` is fine.

## Rotating Secrets Safely

When you need to update a secret (like password rotation):

1. **Test new value locally first**
2. **Update the secret in GitHub**
3. **Update corresponding value on VPS** (e.g., PostgreSQL password)
4. **Run a test deployment**
5. **Keep old values until new ones work**

## Example Complete Setup

```
# Your local machine
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions -N ""
ssh-copy-id -i ~/.ssh/github-actions.pub deploy@YOUR-VPS-IP

# Your VPS
ssh deploy@YOUR-VPS-IP
bash vps-prepare.sh
cat ~/postgres-password.txt  # Copy this

# GitHub Secrets
VPS_HOST = 123.45.67.89
VPS_USER = deploy
VPS_PORT = 22
VPS_SSH_KEY = (content of ~/.ssh/github-actions)
DB_PASSWORD = (from postgres-password.txt)
JWT_SECRET = (openssl rand -hex 32)
```

## Ready?

Once all secrets are set, push a commit and watch the deployment happen in GitHub Actions! 🚀

---

**Need help?** See `AUTOMATED_DEPLOYMENT.md` for the complete guide.


# 🔐 GitHub Secret für JWT einrichten

## Schnellanleitung

### Schritt 1: Sicheren JWT Secret generieren

**Auf Ihrem lokalen Computer (PowerShell):**

```powershell
# Generiere einen sicheren 64-Zeichen String
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**ODER mit Git Bash / WSL:**

```bash
openssl rand -base64 64 | tr -d '\n'
```

**Kopieren Sie den generierten String!** (mindestens 64 Zeichen)

---

### Schritt 2: Secret in GitHub hinzufügen

1. **Gehen Sie zu Ihrem GitHub Repository**
   ```
   https://github.com/IHR_USERNAME/IHR_REPO_NAME
   ```

2. **Klicken Sie auf:** `Settings` → `Secrets and variables` → `Actions`

3. **Klicken Sie auf:** `New repository secret`

4. **Fügen Sie den Secret hinzu:**
   - **Name:** `JWT_SECRET`
   - **Value:** [Ihr generierter String aus Schritt 1]

5. **Klicken Sie auf:** `Add secret`

---

### Schritt 3: Deployment auslösen

```bash
# Committen und pushen Sie eine Änderung
git add .
git commit -m "Update deployment configuration"
git push origin main
```

Die GitHub Action wird automatisch ausgeführt und verwendet den neuen JWT Secret!

---

## ✅ Was jetzt automatisch passiert

1. ✅ **GitHub Action** nimmt `JWT_SECRET` aus den Repository Secrets
2. ✅ **Deploy-Script** empfängt den Secret als Umgebungsvariable
3. ✅ **Falls nicht gesetzt:** Generiert das Script automatisch einen sicheren Secret (512 Bits)
4. ✅ **Server** verwendet den Secret für JWT Token-Signierung

---

## 🔍 Überprüfung

Nach dem Deployment sollte die Registrierung funktionieren:

```bash
curl -X 'POST' \
  'https://api.markt.ma/api/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
  "email": "test@markt.ma",
  "password": "password123"
}'
```

**Erwartete Response:**
```json
{
  "message": "User registered successfully"
}
```

---

## 🐛 Troubleshooting

### Problem: "The specified key byte array is 192 bits..."

**Lösung:** Der Secret ist zu kurz. Stellen Sie sicher, dass:
- Der generierte String mindestens 64 Zeichen hat
- Der Secret korrekt in GitHub Secrets eingefügt wurde (kein Whitespace!)

### Problem: Secret wird nicht verwendet

**Prüfen Sie die GitHub Actions Logs:**
1. Gehen Sie zu `Actions` Tab in GitHub
2. Klicken Sie auf den letzten Workflow Run
3. Suchen Sie nach: `⚠️  JWT_SECRET not provided - generating secure random secret...`

Wenn diese Meldung erscheint, wurde der Secret nicht korrekt übergeben.

---

## 📋 Alle benötigten GitHub Secrets

Stellen Sie sicher, dass diese Secrets in GitHub gesetzt sind:

| Secret Name | Beschreibung | Beispiel |
|-------------|--------------|----------|
| `VPS_HOST` | IP-Adresse Ihres Servers | `195.90.210.156` |
| `VPS_USER` | SSH Username | `root` |
| `VPS_SSH_KEY` | Privater SSH Key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `VPS_PORT` | SSH Port | `22` |
| `DB_PASSWORD` | PostgreSQL Passwort | `IhrSicheresDBPasswort` |
| `JWT_SECRET` | JWT Secret (min. 256 Bits) | `Ihr64ZeichenLangerString...` |

---

## 🎯 Nächste Schritte

1. ✅ JWT_SECRET in GitHub Secrets setzen
2. ✅ Code committen und pushen
3. ✅ GitHub Action läuft automatisch
4. ✅ Testen Sie die API: `/api/auth/register`

**Fertig!** 🎉


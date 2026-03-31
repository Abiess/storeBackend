# 🚀 Deployment-Konfiguration für KI-Feature

## ✅ GitHub Secret bereits konfiguriert

Sie haben den Token bereits in GitHub Secrets gespeichert. Perfekt! ✓

---

## 📝 Was wurde konfiguriert

### 1. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)

Hinzugefügt:
```yaml
export HUGGINGFACE_API_KEY="${{ secrets.HUGGINGFACE_API_KEY }}"
```

Der Token wird jetzt automatisch beim Deployment als Environment Variable exportiert.

### 2. **Production Configuration** (`application-production.yml`)

Hinzugefügt:
```yaml
huggingface:
  api:
    key: ${HUGGINGFACE_API_KEY:}
```

Die Anwendung liest den Token aus der Environment Variable.

---

## 🔐 GitHub Secret Checklist

Stellen Sie sicher, dass in **GitHub → Settings → Secrets and variables → Actions** folgendes Secret existiert:

- [x] **Name:** `HUGGINGFACE_API_KEY`
- [x] **Value:** `hf_xxxxxxxxxxxxxxxxxxxxxxxxxx` (Ihr Token)

---

## 🚀 Deployment-Ablauf

Beim nächsten Push auf `main` oder `master`:

1. ✅ GitHub Actions startet automatisch
2. ✅ Maven baut die Anwendung
3. ✅ JAR-Datei wird auf VPS hochgeladen
4. ✅ **Environment Variables werden exportiert:**
   - SMTP-Konfiguration
   - Datenbank-Passwort
   - JWT Secret
   - **HUGGINGFACE_API_KEY** ← Neu!
5. ✅ Deployment-Script startet die Anwendung
6. ✅ Health Check validiert den Start

---

## 🧪 Testen nach Deployment

### 1. SSH auf VPS verbinden:
```bash
ssh your-user@your-vps-host
```

### 2. Prüfen, ob die Environment Variable gesetzt ist:
```bash
# Prüfe systemd service environment
sudo systemctl show storebackend --property=Environment | grep HUGGINGFACE
```

### 3. Logs überprüfen:
```bash
# Letzte 50 Zeilen
sudo journalctl -u storebackend -n 50 --no-pager

# Live-Logs verfolgen
sudo journalctl -u storebackend -f
```

### 4. API testen:
```bash
# Health Check
curl https://markt.ma/actuator/health

# AI Endpoint testen (mit JWT Token)
curl -X POST "https://markt.ma/api/stores/1/products/ai-suggest" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@test-product.jpg"
```

---

## 🔧 Manuelle Konfiguration (Falls nötig)

Falls die Environment Variable nicht automatisch gesetzt wird:

### Option 1: systemd Service File editieren
```bash
sudo nano /etc/systemd/system/storebackend.service
```

Füge hinzu:
```ini
[Service]
Environment="HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Reload & Restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart storebackend
```

### Option 2: Environment File
```bash
sudo nano /opt/storebackend/env.sh
```

Inhalt:
```bash
export HUGGINGFACE_API_KEY="hf_xxxxxxxxxxxxxxxxxxxxxxxxxx"
```

In Service laden:
```bash
# In storebackend.service:
EnvironmentFile=/opt/storebackend/env.sh
```

---

## 🐛 Troubleshooting

### Problem: "API key is not configured"

**Ursache:** Environment Variable nicht gesetzt

**Lösung:**
```bash
# 1. Prüfen
sudo systemctl show storebackend --property=Environment

# 2. Logs checken
sudo journalctl -u storebackend -n 100 | grep -i hugging

# 3. Manuell setzen (siehe oben)
```

### Problem: Deployment schlägt fehl

**Prüfen:**
```bash
# GitHub Actions Log in GitHub UI ansehen
# oder
curl https://api.github.com/repos/YOUR_ORG/YOUR_REPO/actions/runs
```

### Problem: Secret nicht gefunden

**In GitHub:**
1. Gehe zu **Repository → Settings**
2. Klicke **Secrets and variables → Actions**
3. Verifiziere **HUGGINGFACE_API_KEY** existiert
4. Falls nicht: **New repository secret** → Hinzufügen

---

## ✅ Deployment Checklist

Vor dem Deployment:
- [x] `HUGGINGFACE_API_KEY` in GitHub Secrets gespeichert
- [x] Workflow-Datei aktualisiert (bereits erledigt)
- [x] application-production.yml aktualisiert (bereits erledigt)
- [ ] Code committed und gepusht

Nach dem Deployment:
- [ ] GitHub Actions Workflow erfolgreich durchgelaufen
- [ ] Health Check zeigt Status 200
- [ ] Environment Variable auf VPS gesetzt
- [ ] Logs zeigen keine Fehler
- [ ] AI-Feature manuell getestet

---

## 📊 Monitoring

### Prüfe ob das Feature läuft:

```bash
# 1. Service Status
sudo systemctl status storebackend

# 2. App läuft
curl http://localhost:8080/actuator/health

# 3. Environment Variables
sudo systemctl show storebackend --property=Environment | grep HUGGING

# 4. Logs in Echtzeit
sudo journalctl -u storebackend -f
```

### Erfolgreiche Logs sollten zeigen:
```
✅ AiImageCaptioningService initialized
✅ Generating AI product suggestion for image: product.jpg
✅ AI suggestion generated successfully
```

### Fehler-Logs (falls Token fehlt):
```
❌ Hugging Face API key is not configured
```

---

## 🎉 Nächste Schritte

1. **Code committen:**
   ```bash
   git add .
   git commit -m "Add Hugging Face API configuration for AI product creation"
   git push origin main
   ```

2. **GitHub Actions beobachten:**
   - Gehe zu **Actions** Tab in GitHub
   - Warte auf grünen Haken ✅

3. **Feature testen:**
   - Öffne die Produkterstellung
   - Klicke auf "🤖 KI-Assistent"
   - Lade ein Bild hoch
   - Klicke "Generieren"

4. **Bei Erfolg:**
   - 🎉 Feature ist live!
   - Nutzer können jetzt KI-Produkterstellung verwenden

---

## 📞 Support

Bei Problemen:
1. Logs prüfen: `sudo journalctl -u storebackend -n 100`
2. Environment prüfen: `sudo systemctl show storebackend --property=Environment`
3. Service neu starten: `sudo systemctl restart storebackend`
4. GitHub Actions Re-run: Im Actions Tab "Re-run jobs"

---

**Status:** ✅ Konfiguration abgeschlossen und bereit für Deployment!

Beim nächsten Push wird der Token automatisch gesetzt und das KI-Feature ist produktionsbereit.


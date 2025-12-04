# 🚀 Quick Setup Guide: Backend auf api.markt.ma

## ✅ Aktueller Status
- **Server-IP**: `212.227.58.56`
- **Backend läuft**: Port 8080
- **Ziel-Domain**: `api.markt.ma`

---

## 📋 Setup in 3 Schritten

### Schritt 1: DNS konfigurieren (5 Minuten)

Gehen Sie zu Ihrem DNS-Provider (wo markt.ma registriert ist):

**Neuen A-Record erstellen:**
```
Type: A
Name/Host: api
Value/Points to: 212.227.58.56
TTL: 3600 (oder Auto)
```

**Ergebnis:** `api.markt.ma` → `212.227.58.56`

### Schritt 2: DNS-Test (nach 10-15 Minuten)

```powershell
# Windows PowerShell
nslookup api.markt.ma

# Sollte anzeigen:
# Address: 212.227.58.56
```

### Schritt 3: GitHub Secret aktualisieren

1. Öffnen Sie: https://github.com/IHR-REPO/settings/secrets/actions
2. Klicken Sie auf: `VPS_HOST`
3. Ändern Sie den Wert auf: `api.markt.ma`
4. Speichern

**Fertig!** Beim nächsten Push verwendet GitHub Actions automatisch die Domain.

---

## 🧪 Testen Sie die API

### Mit IP (funktioniert sofort):
```bash
curl http://212.227.58.56:8080/actuator/health
curl http://212.227.58.56:8080/api/plans
```

### Mit Domain (nach DNS-Setup):
```bash
curl http://api.markt.ma:8080/actuator/health
curl http://api.markt.ma:8080/api/plans
```

### PowerShell Test-Script:
```powershell
.\test-production-api.ps1
```
Das Script fragt Sie, ob Sie IP oder Domain testen möchten.

---

## 🔒 Optional: HTTPS mit Nginx (Empfohlen!)

### Warum HTTPS?
- ✅ Professionelle URL ohne Port: `https://api.markt.ma`
- ✅ Sichere Verbindung (SSL/TLS)
- ✅ Bessere SEO
- ✅ Kostenlos mit Let's Encrypt

### Setup (auf dem Server):

```bash
# SSH zum Server
ssh root@212.227.58.56

# Nginx installieren
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# Nginx-Konfiguration erstellen
sudo nano /etc/nginx/sites-available/api.markt.ma

# Inhalt einfügen:
server {
    listen 80;
    server_name api.markt.ma;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Speichern mit: Ctrl+X, Y, Enter

# Aktivieren
sudo ln -s /etc/nginx/sites-available/api.markt.ma /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL-Zertifikat einrichten
sudo certbot --nginx -d api.markt.ma
# Folgen Sie den Anweisungen (Email eingeben, Agree to Terms)

# Fertig!
```

### Nach SSL-Setup:
- ✅ `https://api.markt.ma` (HTTPS, ohne Port!)
- ✅ Automatische Weiterleitung von HTTP → HTTPS
- ✅ Zertifikat erneuert sich automatisch alle 90 Tage

---

## 📊 URL-Vergleich

| Szenario | URL | Status |
|----------|-----|--------|
| **Aktuell (IP)** | `http://212.227.58.56:8080` | ✅ Funktioniert |
| **Nach DNS** | `http://api.markt.ma:8080` | ⏳ Nach DNS-Setup |
| **Mit Nginx** | `http://api.markt.ma` | 🎯 Kein Port nötig |
| **Mit SSL** | `https://api.markt.ma` | 🌟 Empfohlen! |

---

## 🎯 Empfohlene Domain-Struktur

```
markt.ma              → Frontend (Angular App)
api.markt.ma          → Backend API (Spring Boot)
minio.markt.ma        → File Storage (optional)
*.markt.ma            → Shops (z.B. shop1.markt.ma)
```

---

## ✅ Checkliste

- [ ] DNS A-Record erstellt (`api → 212.227.58.56`)
- [ ] 10 Minuten gewartet für DNS-Propagation
- [ ] DNS getestet: `nslookup api.markt.ma`
- [ ] API mit Domain getestet: `curl http://api.markt.ma:8080/actuator/health`
- [ ] GitHub Secret `VPS_HOST` auf `api.markt.ma` geändert
- [ ] Optional: Nginx installiert
- [ ] Optional: SSL mit Let's Encrypt eingerichtet

---

## 🐛 Häufige Probleme

### "Could not resolve hostname api.markt.ma"
**Lösung:** DNS noch nicht propagiert. Warten Sie 10-30 Minuten.
**Workaround:** Nutzen Sie vorerst die IP: `212.227.58.56`

### "Connection refused"
**Lösung:** Firewall-Regel hinzufügen:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
```

### GitHub Actions Deployment schlägt fehl
**Lösung:** Prüfen Sie, dass `VPS_HOST` korrekt ist:
- ✅ Richtig: `api.markt.ma`
- ❌ Falsch: `http://api.markt.ma`
- ❌ Falsch: `https://api.markt.ma`
- ❌ Falsch: `api.markt.ma:8080`

---

## 📞 Support & Dokumentation

- Vollständige Anleitung: `DOMAIN_SETUP.md`
- API-Tests: `test-production-api.ps1`
- DNS-Setup-Guide: `DNS_SETUP_GUIDE.md`

---

## 🎉 Zusammenfassung

**Minimal-Setup (ohne HTTPS):**
1. DNS A-Record: `api → 212.227.58.56`
2. GitHub Secret: `VPS_HOST = api.markt.ma`
3. Fertig! → `http://api.markt.ma:8080`

**Empfohlenes Setup (mit HTTPS):**
1. DNS A-Record: `api → 212.227.58.56`
2. Nginx + Certbot installieren
3. GitHub Secret: `VPS_HOST = api.markt.ma`
4. Fertig! → `https://api.markt.ma` 🌟


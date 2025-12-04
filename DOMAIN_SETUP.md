# 🌐 Domain statt IP-Adresse verwenden

## Aktueller Status
- ✅ Backend läuft auf VPS mit IP: `212.227.58.56`
- ✅ System unterstützt Domain-Namen (keine Code-Änderung nötig!)
- 🎯 Ziel-Domain: `api.markt.ma`

## 📋 Schritte zur Umstellung auf Domain

### Schritt 1: DNS A-Record erstellen

Bei Ihrem DNS-Provider (für markt.ma):

```
Type: A
Host: api
Value: 212.227.58.56
TTL: 3600 (oder Auto)
```

**Empfohlene Domain-Struktur:**
- `api.markt.ma` → 212.227.58.56 (Backend API)
- `markt.ma` → 212.227.58.56 (Frontend/Homepage)
- `minio.markt.ma` → 212.227.58.56 (MinIO - optional)
- `*.markt.ma` → 212.227.58.56 (Wildcard für Shops)

### Schritt 2: DNS-Propagation testen

Warten Sie 5-10 Minuten, dann testen:

```powershell
# Windows PowerShell
nslookup api.markt.ma

# Sollte anzeigen:
# Address: 212.227.58.56
```

Oder online: https://dnschecker.org/

### Schritt 3: GitHub Secret aktualisieren

1. GitHub Repository → **Settings**
2. **Secrets and variables** → **Actions**
3. Klicken Sie auf **VPS_HOST**
4. Ändern Sie:
   ```
   ALT: 165.232.65.93
   NEU: api.markt.ma
   ```
5. **Update secret**

### Schritt 4: Testen (ohne Deployment)

```powershell
# SSH-Verbindung testen
ssh root@api.markt.ma

# API testen (nach DNS-Propagation)
curl http://api.markt.ma:8080/actuator/health
```

### Schritt 5: Deployment testen

```bash
# Kleinen Commit machen
git commit --allow-empty -m "Test deployment with domain api.markt.ma"
git push
```

GitHub Actions wird jetzt die Domain verwenden!

---

## 🔒 Optional: SSL/HTTPS einrichten

Wenn Sie HTTPS möchten (empfohlen für Production):

### Nginx Reverse Proxy + Let's Encrypt

```bash
# Auf dem VPS (212.227.58.56):

# 1. Nginx installieren
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# 2. Nginx-Konfiguration erstellen
sudo nano /etc/nginx/sites-available/storebackend

# Inhalt:
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

# 3. Aktivieren
sudo ln -s /etc/nginx/sites-available/storebackend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 4. SSL-Zertifikat (Let's Encrypt)
sudo certbot --nginx -d api.markt.ma

# Certbot konfiguriert automatisch HTTPS!
```

Nach SSL-Setup:
- ✅ API läuft auf: `https://api.markt.ma`
- ✅ Automatische HTTP → HTTPS Weiterleitung
- ✅ Kostenlose SSL-Zertifikate (automatische Erneuerung)

---

## 📊 Vergleich: IP vs. Domain

| Aspekt | IP-Adresse | Domain-Name |
|--------|-----------|-------------|
| **URL** | `http://212.227.58.56:8080` | `https://api.markt.ma` |
| **Lesbarkeit** | ❌ Schwer zu merken | ✅ Einfach zu merken |
| **Professionell** | ❌ Nicht professionell | ✅ Professionell |
| **SSL/HTTPS** | ⚠️ Kompliziert | ✅ Einfach mit Let's Encrypt |
| **Änderungen** | ❌ Bei Server-Wechsel alle URLs ändern | ✅ Nur DNS anpassen |
| **SEO** | ❌ Schlecht | ✅ Gut |

---

## ✅ Schnell-Checkliste

- [ ] DNS A-Record erstellt (`api.markt.ma` → `212.227.58.56`)
- [ ] DNS propagiert (mit `nslookup` testen)
- [ ] GitHub Secret `VPS_HOST` auf `api.markt.ma` aktualisiert
- [ ] SSH-Verbindung mit Domain getestet: `ssh root@api.markt.ma`
- [ ] API mit Domain getestet: `curl http://api.markt.ma:8080/actuator/health`
- [ ] Optional: Nginx + SSL eingerichtet für `https://api.markt.ma`

---

## 🎯 Empfohlene Domain-Struktur für markt.ma

```
markt.ma                  → Frontend/Homepage
api.markt.ma             → Backend API (Spring Boot)
minio.markt.ma           → MinIO (Datei-Upload)
*.markt.ma               → Wildcard für Shops (shop1.markt.ma, shop2.markt.ma, etc.)
```

---

## 🐛 Troubleshooting

### Problem: "Could not resolve hostname"
```bash
# Lösung: DNS noch nicht propagiert
# Warten Sie 10-30 Minuten oder nutzen Sie vorerst die IP
ssh root@212.227.58.56
```

### Problem: "Connection refused"
```bash
# Lösung: Firewall-Regel für Domain hinzufügen
sudo ufw allow 'Nginx Full'  # Wenn Nginx verwendet wird
sudo ufw allow 8080/tcp       # Direkter Zugriff
```

### Problem: GitHub Actions schlägt fehl
```bash
# Lösung: VPS_HOST in GitHub Secrets prüfen
# Stelle sicher, dass kein http:// oder https:// im Secret ist
# Nur: api.markt.ma (NICHT: http://api.markt.ma)
```

---

## 📝 Zusammenfassung

**Aktuell:** Backend läuft auf `212.227.58.56:8080`

**Nach Domain-Setup:**
- Ohne SSL: `http://api.markt.ma:8080`
- Mit Nginx: `http://api.markt.ma`
- Mit Nginx + SSL: `https://api.markt.ma` ✅ Empfohlen!

**Änderungen im Code:** ❌ Keine nötig!
- Alle Konfigurationen verwenden bereits `VPS_HOST`
- GitHub Secrets aktualisieren reicht aus

---

## 🚀 Schnellstart (Minimale Schritte)

1. **DNS konfigurieren** (bei Ihrem Domain-Provider):
   ```
   A-Record: api → 212.227.58.56
   ```

2. **Testen**:
   ```powershell
   nslookup api.markt.ma
   # Sollte zeigen: 212.227.58.56
   ```

3. **GitHub Secret aktualisieren**:
   - `VPS_HOST` = `api.markt.ma`

4. **Push & Deploy**:
   ```bash
   git push
   ```

5. **API aufrufen**:
   - `http://api.markt.ma:8080/actuator/health`
   - `http://api.markt.ma:8080/api/plans`

**Fertig!** 🎉

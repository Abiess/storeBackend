# 🚀 Frontend Deployment auf markt.ma

## ✅ Was wurde vorbereitet

### 1. GitHub Actions Workflow
- `.github/workflows/deploy-frontend.yml` erstellt
- Automatisches Build & Deployment bei Push auf `master`
- Nginx-Konfiguration für markt.ma wird automatisch erstellt

### 2. Production Environment
- API-URL: `https://store.daddeln.online/api` ✅
- Frontend wird deployed nach: `/var/www/markt.ma/current`

### 3. Nginx Konfiguration
- Domain: `markt.ma` und `www.markt.ma`
- Angular SPA Routing konfiguriert
- Gzip Compression aktiviert
- Security Headers gesetzt
- Static Asset Caching

---

## 📋 DNS-Konfiguration (WICHTIG!)

Konfigurieren Sie folgende DNS-Records bei Ihrem Domain-Provider:

```
markt.ma          A      [VPS-IP-Adresse]
www.markt.ma      A      [VPS-IP-Adresse]
```

**Beispiel:**
```
markt.ma          A      116.203.xxx.xxx
www.markt.ma      A      116.203.xxx.xxx
```

---

## 🚀 Deployment starten

### 1. Code committen und pushen:
```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend

git add .
git commit -m "feat: Frontend deployment für markt.ma mit GitHub Actions"
git push origin master
```

### 2. Deployment beobachten:
- URL: https://github.com/Abiess/storeBackend/actions
- Workflow: "Deploy Frontend to VPS"
- Dauer: ca. 3-5 Minuten

---

## 🔍 Nach dem Deployment

### 1. Frontend testen:
```
http://markt.ma
http://www.markt.ma
```

### 2. SSL-Zertifikat einrichten:
```bash
ssh root@store.daddeln.online

# Let's Encrypt installieren (falls noch nicht vorhanden)
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# SSL-Zertifikat für markt.ma erstellen
sudo certbot --nginx -d markt.ma -d www.markt.ma

# Bestätigen Sie die Prompts:
# - Email-Adresse eingeben
# - Terms of Service akzeptieren
# - Redirect HTTP → HTTPS wählen (Option 2)
```

### 3. Nach SSL-Setup:
```
https://markt.ma  ← Hauptseite (mit SSL)
https://www.markt.ma
```

---

## 🎯 Was passiert beim Deployment?

1. ✅ Angular App wird gebaut (`npm run build:prod`)
2. ✅ Build-Dateien werden gepackt
3. ✅ Dateien werden zum VPS übertragen
4. ✅ Alte Version wird als Backup gesichert
5. ✅ Neue Version wird entpackt nach `/var/www/markt.ma/current`
6. ✅ Nginx wird konfiguriert für markt.ma
7. ✅ Nginx wird neu geladen

---

## 📂 Verzeichnisstruktur auf VPS

```
/var/www/markt.ma/
├── current/                      ← Aktive Version
│   ├── index.html
│   ├── main.*.js
│   ├── polyfills.*.js
│   ├── styles.*.css
│   └── assets/
├── backup-20251215-143000/       ← Backup 1
├── backup-20251215-120000/       ← Backup 2
└── backup-20251214-180000/       ← Backup 3
```

---

## 🐛 Troubleshooting

### Frontend lädt nicht?

1. **DNS prüfen:**
   ```bash
   nslookup markt.ma
   ping markt.ma
   ```

2. **Nginx Status:**
   ```bash
   ssh root@store.daddeln.online
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **Nginx Logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

4. **Dateien prüfen:**
   ```bash
   ls -la /var/www/markt.ma/current
   cat /var/www/markt.ma/current/index.html
   ```

### Build-Fehler?

1. **Lokal testen:**
   ```bash
   cd storeFrontend
   npm install
   npm run build:prod
   ```

2. **GitHub Actions Logs prüfen:**
   - https://github.com/Abiess/storeBackend/actions

---

## ✅ Checkliste

- [ ] DNS A-Records für markt.ma und www.markt.ma konfiguriert
- [ ] Code committed und gepusht
- [ ] GitHub Actions erfolgreich durchgelaufen
- [ ] Frontend unter http://markt.ma erreichbar
- [ ] SSL-Zertifikat mit certbot installiert
- [ ] Frontend unter https://markt.ma erreichbar

---

## 🔄 Updates deployen

Jede Änderung im `storeFrontend/` Ordner triggert automatisch ein neues Deployment:

```bash
# Änderungen machen in storeFrontend/
git add storeFrontend/
git commit -m "Update: ..."
git push origin master

# → GitHub Actions deployt automatisch! 🚀
```

---

## 📞 Wichtige Commands

```bash
# SSH zum VPS
ssh root@store.daddeln.online

# Nginx neustarten
sudo systemctl restart nginx

# Nginx Status
sudo systemctl status nginx

# SSL erneuern (automatisch)
sudo certbot renew --dry-run

# Frontend-Dateien ansehen
cd /var/www/markt.ma/current
ls -la
```


# 🚀 Frontend Deployment Guide

## Übersicht

Das Frontend wird automatisch über **GitHub Actions** deployed, sobald Änderungen im `storeFrontend/` Ordner gepusht werden.

## ✅ Was wurde harmonisiert

### 1️⃣ **API-URLs angepasst**
- **Development:** `http://localhost:8080/api`
- **Production:** `https://store.daddeln.online/api` ✅

### 2️⃣ **Category → Product Beziehung**
- ✅ **Backend:** Many-to-One (ein Produkt hat eine Kategorie)
- ✅ **Frontend:** Single-Select Dropdown (statt Multi-Checkbox)
- ✅ **Models synchronisiert:** `categoryId?: number` im Product Interface

### 3️⃣ **Product Form**
- ✅ Dropdown für Kategorie-Auswahl
- ✅ Optional: Produkt kann ohne Kategorie erstellt werden
- ✅ Kategorie-Name wird in der Produktliste angezeigt

---

## 🔧 GitHub Actions Workflow

Die Datei `.github/workflows/deploy-frontend.yml` wurde erstellt und führt folgende Schritte aus:

### Build-Prozess:
1. ✅ Code auschecken
2. ✅ Node.js 18 installieren
3. ✅ Dependencies installieren (`npm ci`)
4. ✅ Angular App bauen (`npm run build:prod`)
5. ✅ Build-Dateien packen (`.tar.gz`)

### Deployment:
1. ✅ Dateien zum VPS übertragen (SCP)
2. ✅ Alte Version als Backup sichern
3. ✅ Neue Version nach `/var/www/storefront/current` extrahieren
4. ✅ Berechtigungen setzen (`www-data`)
5. ✅ Nginx konfigurieren (automatisch)
6. ✅ Health-Check durchführen

---

## 📋 Voraussetzungen

### GitHub Secrets (bereits vorhanden):
- ✅ `VPS_HOST` - store.daddeln.online
- ✅ `VPS_USER` - root
- ✅ `VPS_SSH_KEY` - SSH Private Key

### Auf dem VPS:
- ✅ Nginx installiert
- ⚠️ **NEU:** Subdomain `frontend.store.daddeln.online` muss in DNS konfiguriert werden

---

## 🌐 DNS-Konfiguration

Fügen Sie einen A-Record hinzu:

```
frontend.store.daddeln.online  →  A  →  Ihre VPS IP
```

Oder verwenden Sie die Haupt-Domain:

```
store.daddeln.online  →  A  →  Ihre VPS IP
```

---

## 🚀 Deployment auslösen

### Automatisch:
```bash
git add storeFrontend/
git commit -m "feat: Update frontend"
git push origin master
```

### Manuell:
1. Gehen Sie zu: https://github.com/Abiess/storeBackend/actions
2. Wählen Sie "Deploy Frontend to VPS"
3. Klicken Sie auf "Run workflow"

---

## 📂 Verzeichnisstruktur auf VPS

```
/var/www/storefront/
├── current/                    # Aktuelle Version
│   ├── index.html
│   ├── assets/
│   └── *.js, *.css
├── backup-20251215-143000/     # Backup 1
├── backup-20251215-120000/     # Backup 2
└── backup-20251214-180000/     # Backup 3
```

---

## 🔒 SSL/HTTPS einrichten (Optional)

Nach erfolgreichem Deployment:

```bash
ssh root@store.daddeln.online

# Let's Encrypt installieren
sudo apt install certbot python3-certbot-nginx -y

# SSL-Zertifikat erstellen
sudo certbot --nginx -d frontend.store.daddeln.online

# Auto-Renewal testen
sudo certbot renew --dry-run
```

---

## 🧪 Testen

### Lokal:
```bash
cd storeFrontend
npm install
npm start
```

URL: http://localhost:4200

### Production:
URL: http://frontend.store.daddeln.online (oder http://store.daddeln.online)

---

## 📝 Wichtige Dateien

### Environment-Konfiguration:
- `src/environments/environment.ts` - Development
- `src/environments/environment.prod.ts` - Production ✅

### Models:
- `src/app/core/models.ts` - Product & Category Interfaces ✅

### Services:
- `src/app/core/services/product.service.ts` ✅
- `src/app/core/services/category.service.ts` ✅

### Components:
- `src/app/features/products/product-form.component.ts` ✅ (Single-Select)
- `src/app/features/products/product-list.component.ts`
- `src/app/features/products/category-form.component.ts`

---

## 🐛 Troubleshooting

### Frontend lädt nicht:
1. Prüfen Sie Nginx Status: `sudo systemctl status nginx`
2. Prüfen Sie Logs: `sudo tail -f /var/log/nginx/error.log`
3. Prüfen Sie Dateien: `ls -la /var/www/storefront/current`

### API-Verbindung fehlschlägt:
1. Prüfen Sie die URL in `environment.prod.ts`
2. Prüfen Sie CORS-Einstellungen im Backend
3. Prüfen Sie Backend-Status: `sudo systemctl status storebackend`

### Build-Fehler:
1. Lokal testen: `npm run build:prod`
2. Dependencies aktualisieren: `npm install`
3. Cache löschen: `rm -rf node_modules package-lock.json && npm install`

---

## ✅ Checkliste vor dem ersten Deployment

- [x] Frontend-Code angepasst (Single-Select für Kategorien)
- [x] Environment-URLs korrekt (store.daddeln.online)
- [x] GitHub Actions Workflow erstellt
- [x] GitHub Secrets vorhanden
- [ ] DNS für Frontend-Subdomain konfiguriert
- [ ] Test-Deployment durchgeführt
- [ ] SSL-Zertifikat installiert (optional)

---

## 🎯 Nächste Schritte

1. **Committen und Pushen:**
   ```bash
   git add .
   git commit -m "feat: Harmonize frontend with backend + GitHub Actions deployment"
   git push origin master
   ```

2. **DNS konfigurieren:**
   - A-Record für `frontend.store.daddeln.online` erstellen

3. **Deployment beobachten:**
   - https://github.com/Abiess/storeBackend/actions

4. **Testen:**
   - Login → Store erstellen → Kategorie erstellen → Produkt mit Kategorie erstellen

---

## 📞 Support

Bei Problemen:
1. GitHub Actions Logs prüfen
2. VPS Logs prüfen: `sudo journalctl -u nginx -f`
3. Backend Logs prüfen: `sudo journalctl -u storebackend -f`


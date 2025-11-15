# 🚀 SEO Admin-Seiten - Quick Start Guide

## ✅ Konfiguration ist fertig!

Die SEO-Admin-Routen sind jetzt in Ihrer App integriert und der Mock-Mode ist aktiviert.

---

## 📍 Admin-Seiten URLs

### 1. **SEO Einstellungen**
```
http://localhost:4200/admin/store/1/seo
```
**Features:**
- Site Name, Title Template, Meta Description bearbeiten
- Canonical Base URL setzen
- Robots Index Toggle (noindex/index)
- Social Media Links (Twitter, Facebook, Instagram, YouTube, LinkedIn)
- OG Image hochladen (simuliert im Mock Mode)
- Hreflang für mehrere Sprachen konfigurieren

### 2. **URL Redirects**
```
http://localhost:4200/admin/store/1/seo/redirects
```
**Features:**
- 3 Beispiel-Redirects anzeigen (1 Regex, 2 Exact)
- Neuen Redirect erstellen (301/302)
- Redirects bearbeiten/löschen
- Regex-Pattern testen mit Test-Input
- Active/Inactive Toggle
- CSV Import/Export
- Search & Filter

### 3. **Structured Data (JSON-LD)**
```
http://localhost:4200/admin/store/1/seo/structured-data
```
**Features:**
- 5 Tabs: PRODUCT, ORGANIZATION, BREADCRUMB, ARTICLE, COLLECTION
- JSON-Editor für Templates
- Variable Helper (zeigt verfügbare Mustache-Variablen)
- Preview-Funktion mit Sample-Daten
- Beispiel-Templates einblenden

---

## 🎭 Mock Mode ist aktiviert!

Der Mock Mode ist standardmäßig **eingeschaltet** - das bedeutet:
- ✅ **Kein Backend nötig** - alle Daten kommen aus dem Mock-Service
- ✅ **Sofort testbar** - einfach Frontend starten
- ✅ **Alle Features funktionieren** - CRUD, Import/Export, Preview
- ✅ **Konsolen-Logging** - sehen Sie alle Mock-Operationen in der Browser-Console

---

## 🏃 So starten Sie die Admin-Seiten:

### Schritt 1: Frontend starten
```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend\storeFrontend
npm start
```

Warten Sie bis:
```
✔ Browser application bundle generation complete.
** Angular Live Development Server is listening on localhost:4200 **
```

### Schritt 2: Browser öffnen

**Option A - Direkt zur SEO-Einstellungen:**
```
http://localhost:4200/admin/store/1/seo
```

**Option B - Direkt zu Redirects:**
```
http://localhost:4200/admin/store/1/seo/redirects
```

**Option C - Direkt zu Structured Data:**
```
http://localhost:4200/admin/store/1/seo/structured-data
```

### Schritt 3: Testen!

#### SEO Einstellungen testen:
1. Ändern Sie den "Site Name" → Speichern
2. Fügen Sie eine Hreflang-Sprache hinzu (z.B. "en" mit "https://demo.com")
3. "OG Image hochladen" klicken (simuliert Upload)
4. Schauen Sie in die Browser-Console: `[MOCK] SEO Settings updated: {...}`

#### Redirects testen:
1. Klicken Sie "Neu" → Redirect-Dialog öffnet sich
2. Fügen Sie ein: `/test-path` → `/new-path` → 301 → Speichern
3. Sehen Sie den neuen Redirect in der Tabelle
4. Toggle "Active" on/off
5. Klicken Sie "Exportieren" → CSV-Datei wird heruntergeladen!

#### Structured Data testen:
1. Wechseln Sie zum PRODUCT-Tab
2. Bearbeiten Sie das JSON-Template
3. Klicken Sie "Vorschau" → gerenderte JSON-LD wird angezeigt
4. Klicken Sie "Verfügbare Variablen" → sehen Sie alle Mustache-Variablen
5. Speichern Sie die Änderungen

---

## 🔍 Was Sie in der Browser-Console sehen:

Wenn Sie eine Aktion durchführen, sehen Sie Mock-Logs:

```javascript
🎭 SEO Mock Mode ENABLED - Using mock data instead of backend

[MOCK] SEO Settings updated: {
  siteName: "Demo Shop",
  canonicalBaseUrl: "https://demo-shop.markt.ma",
  ...
}

[MOCK] Redirect created: {
  id: 4,
  sourcePath: "/test-path",
  targetUrl: "/new-path",
  httpCode: 301
}

[MOCK] Template updated: {
  id: 1,
  type: "PRODUCT",
  templateJson: "{ ... }"
}
```

---

## 🎯 Mock-Daten die bereits vorhanden sind:

### Store 1 (Demo Shop)
- **Site Name:** "Demo Shop"
- **Canonical URL:** https://demo-shop.markt.ma
- **Twitter:** @demoshop
- **2 Hreflang-Sprachen:** DE, EN

### 3 Beispiel-Redirects
1. `/old-hoodie` → `/products/new-hoodie` (301, Exact, Active)
2. `/products/(\d+).*` → `/p/$1` (302, Regex, Active)
3. `/sale` → `/clearance` (301, Exact, **Inactive**)

### 3 Structured Data Templates
1. **PRODUCT** - Vollständiges Product Schema mit Offer
2. **ORGANIZATION** - Organization mit Social Links
3. **BREADCRUMB** - BreadcrumbList mit Mustache-Loop

---

## ⚡ Schnellzugriff (ohne AuthGuard)

Falls der AuthGuard Sie blockiert, können Sie ihn temporär umgehen:

### Option 1: AuthGuard temporär deaktivieren

In `app.routes.ts` entfernen Sie `canActivate: [authGuard]` bei den SEO-Routen:

```typescript
{
  path: 'admin/store/:storeId/seo',
  loadComponent: () => import('./features/settings/seo-settings-page/seo-settings-page.component').then(m => m.SeoSettingsPageComponent)
  // canActivate: [authGuard] <- entfernt
}
```

### Option 2: Erst einloggen

1. Gehen Sie zu: `http://localhost:4200/login`
2. Loggen Sie sich ein (falls Mock-Login vorhanden)
3. Dann navigieren Sie zu: `http://localhost:4200/admin/store/1/seo`

---

## 🔄 Zwischen Mock und echtem Backend wechseln

### Mock Mode AUS (echtes Backend verwenden):

1. Öffnen Sie: `src/app/core/mocks/seo-mock-config.ts`
2. Ändern Sie:
   ```typescript
   enabled: false  // Mock Mode AUS
   ```
3. Starten Sie das Backend:
   ```bash
   cd C:\Users\t13016a\Downloads\Team2\storeBackend
   mvn spring-boot:run
   ```
4. Frontend neu laden - verwendet jetzt echte API-Calls!

### Mock Mode AN (kein Backend nötig):
```typescript
enabled: true  // Mock Mode AN
```

---

## 📱 Responsive Design

Alle Admin-Seiten sind responsive:
- ✅ **Desktop** - Vollständiges Layout
- ✅ **Tablet** - Angepasste Grids
- ✅ **Mobile** - Optimierte Navigation

Testen Sie mit Chrome DevTools (F12 → Device Toolbar)

---

## 🎨 Keyboard Shortcuts

In der Admin-UI:
- **Ctrl + S** - Speichern (in manchen Browsern)
- **Tab** - Zwischen Feldern wechseln
- **Enter** - Formular absenden (in Dialogen)
- **Esc** - Dialog schließen

---

## 🐛 Troubleshooting

### Problem: "Cannot GET /admin/store/1/seo"
**Lösung:** Frontend läuft nicht. Starten Sie `npm start`

### Problem: "404 Not Found"
**Lösung:** Routen wurden nicht korrekt hinzugefügt. Prüfen Sie `app.routes.ts`

### Problem: "AuthGuard blockiert Zugriff"
**Lösung:** 
- Option 1: Loggen Sie sich ein
- Option 2: Entfernen Sie temporär `canActivate: [authGuard]`

### Problem: "Service not found"
**Lösung:** Mock-Provider fehlt. Prüfen Sie `app.config.ts` → `provideSeoApi()`

### Problem: "Keine Daten werden angezeigt"
**Lösung:** Mock Mode ist deaktiviert. Setzen Sie in `seo-mock-config.ts`:
```typescript
enabled: true
```

---

## ✅ Checkliste vor dem Start

- [ ] Frontend installiert: `npm install` (falls noch nicht)
- [ ] Mock Mode aktiviert: `seo-mock-config.ts` → `enabled: true`
- [ ] Routen hinzugefügt: `app.routes.ts` (✅ erledigt!)
- [ ] Provider registriert: `app.config.ts` (✅ erledigt!)
- [ ] Frontend gestartet: `npm start`
- [ ] Browser geöffnet: `http://localhost:4200/admin/store/1/seo`

---

## 🎉 Viel Erfolg!

Sie können jetzt **alle SEO-Admin-Features testen** - ohne Backend!

Bei Fragen:
- Console öffnen (F12) → sehen Sie Mock-Logs
- Prüfen Sie `SEO_MOCK_MODE.md` für Details
- Alle Komponenten haben `data-testid` für E2E-Tests

**Happy Testing! 🚀**


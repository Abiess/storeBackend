# Video Automation - File Structure

```
video-automation/
│
├── 📄 START_HERE.md                    ⭐ BEGIN HERE - Installation & erste Schritte
├── 📄 PROJECT_OVERVIEW.md              📋 Projekt-Übersicht & Features
├── 📄 QUICKSTART.md                    🚀 Schnelleinstieg (1 Seite)
├── 📄 README.md                        📚 Vollständige Dokumentation
├── 📄 CI-INTEGRATION.md                🔄 CI/CD Setup (GitHub, GitLab, Jenkins)
├── 📄 ADVANCED_FEATURES.md             🎨 Erweiterte Features (Cursor, Zoom, Voice-Over)
│
├── 🔧 setup.bat                        💻 Windows Setup-Script
├── 🔧 test-pipeline.bat                🧪 Quick-Test für Pipeline
│
├── ⚙️ package.json                     📦 Dependencies & Scripts
├── ⚙️ playwright.config.js             🎭 Playwright Konfiguration
├── ⚙️ .env.example                     🔐 Konfigurations-Template
├── ⚙️ .gitignore                       📝 Git-Ignore Rules
├── ⚙️ Makefile                         🛠️ Make-Commands (optional)
│
├── 📁 tests/
│   ├── 📁 flows/                       🎬 Deine Flow-Definitionen
│   │   ├── login.spec.js              ✅ Login-Flow (fertig)
│   │   ├── checkout.spec.js           ✅ Checkout-Flow (fertig)
│   │   └── products.spec.js           ✅ Product-Browse Flow (fertig)
│   │
│   └── 📁 utils/
│       └── flow-recorder.js           🎥 Recording Utility mit Steps
│
├── 📁 scripts/                         🤖 Automation Scripts
│   ├── record-single.js               🎬 Einzelnen Flow aufnehmen
│   ├── record-all.js                  🎬 Alle Flows aufnehmen
│   ├── process-video.js               ⚙️ Video verarbeiten (ffmpeg)
│   ├── process-all.js                 ⚙️ Alle Videos verarbeiten
│   ├── generate-subtitles.js          📝 Untertitel mit Whisper
│   ├── build-howto.js                 🎞️ Finales Video bauen
│   └── clean.js                       🧹 Aufräumen
│
├── 📁 config/
│   └── translations.js                🌍 Multi-Language Support (de/en/ar)
│
├── 📁 assets/                          🎨 Branding Assets
│   └── README.md                      📖 Asset-Anleitung
│   └── (hier dein logo.png)           🖼️ Dein Logo platzieren
│
└── 📁 output/                          🎬 Generierte Videos
    └── (gitignored)                   📹 Finale Videos landen hier
```

## Quick Commands

```bash
# Setup
setup.bat                              # Alles installieren

# Recording
npm run record checkout                # Einen Flow aufnehmen
npm run record:all                     # Alle Flows aufnehmen

# Processing
npm run process checkout               # Video verarbeiten
npm run process:all                    # Alle Videos verarbeiten

# Build Final
npm run howto checkout                 # Finales Video erstellen

# Complete Pipeline
test-pipeline.bat                      # Alles in einem (Test)

# Cleanup
npm run clean                          # Aufräumen
```

## Start Here

1. Lies **START_HERE.md** für Installation
2. Führe `setup.bat` aus
3. Führe `test-pipeline.bat` aus
4. Check `output/HOWTO_checkout_FINAL.mp4`

## Documentation Guide

- **Neu?** → START_HERE.md
- **Schnelleinstieg?** → QUICKSTART.md
- **Details?** → README.md
- **CI/CD?** → CI-INTEGRATION.md
- **Advanced?** → ADVANCED_FEATURES.md
# 🎬 VIDEO AUTOMATION - INSTALLATION & ERSTE SCHRITTE

## ✅ Was wurde erstellt?

Eine **vollautomatische Video-Pipeline** für dein SaaS mit:

### 📦 26 Dateien erstellt
- ✅ 3 fertige Flow-Definitionen (Login, Checkout, Products)
- ✅ 7 Automation-Scripts (Record, Process, Build)
- ✅ 5 Dokumentationen (README, Quickstart, CI, Advanced, Overview)
- ✅ Multi-Language Support (de/en/ar)
- ✅ CI/CD Templates (GitHub, GitLab, Jenkins, Azure)
- ✅ Windows-Setup-Scripts

---

## 🚀 SOFORT STARTEN (5 Minuten)

### Schritt 1: Installation

```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend\video-automation

# Automatisches Setup
setup.bat

# ODER manuell:
npm install
npm run install:browsers
copy .env.example .env
```

**Was passiert?**
- Installiert Playwright (Browser-Automation)
- Installiert ffmpeg-wrapper (Video-Processing)
- Installiert Whisper-wrapper (Untertitel)
- Erstellt .env Konfigurationsdatei

### Schritt 2: Konfiguration bearbeiten

Öffne `.env` und passe an:

```env
# Deine App-URL (lokal oder staging)
BASE_URL=http://localhost:4200

# Demo-User Credentials (stabiler Test-Account)
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=DemoPass123!

# Branding
BRAND_NAME="Markt-MA"
BRAND_COLOR="#0066cc"

# Sprache
SUBTITLE_LANG=de
```

### Schritt 3: Erstes Video erstellen

```bash
# Quick-Test (komplett automatisch)
test-pipeline.bat
```

**Das passiert:**
1. Browser öffnet sich (Chromium)
2. Führt Checkout-Flow automatisch aus
3. Nimmt Video auf (1080p)
4. Verarbeitet Video (ffmpeg)
5. Erstellt finales Video in `output/`

**➡️ Fertig!** Dein erstes How-to Video ist in: `output/HOWTO_checkout_FINAL.mp4`

---

## 📹 Weitere Videos erstellen

### Einzelne Videos

```bash
# Login-Video
npm run record login
npm run process login
npm run howto login

# Produkt-Browse Video
npm run record products
npm run process products
npm run howto products
```

### Alle Videos auf einmal

```bash
npm run record:all      # Alle Flows aufnehmen
npm run process:all     # Alle Videos verarbeiten

# Dann finale Videos bauen:
npm run howto login
npm run howto checkout
npm run howto products
```

---

## 🎯 Verfügbare Flows

### ✅ 1. Login-Flow
**Datei:** `tests/flows/login.spec.js`
**Zeigt:**
- Homepage besuchen
- Login-Button klicken
- Credentials eingeben
- Anmelden
- Dashboard/Profil sehen

### ✅ 2. Checkout-Flow
**Datei:** `tests/flows/checkout.spec.js`
**Zeigt:**
- Produktübersicht öffnen
- Produkt auswählen
- In Warenkorb legen
- Zur Kasse gehen
- Versanddaten eingeben
- Zahlungsmethode wählen
- Bestellung abschließen

### ✅ 3. Product-Browse-Flow
**Datei:** `tests/flows/products.spec.js`
**Zeigt:**
- Produkte durchsuchen
- Kategorie filtern
- Produktdetails ansehen
- Bilder durchsehen
- Beschreibung lesen

---

## 🔧 System-Requirements

### Bereits vorhanden (Node.js)
✅ Node.js ist installiert
✅ npm ist verfügbar

### Noch installieren:

#### 1. ffmpeg (für Video-Processing)
```bash
# Mit Chocolatey (empfohlen)
choco install ffmpeg

# ODER manuell von:
# https://ffmpeg.org/download.html
# Entpacken und zu PATH hinzufügen
```

**Test:** `ffmpeg -version`

#### 2. Whisper (optional - für Auto-Untertitel)
```bash
# Mit Python
pip install openai-whisper

# ODER whisper.cpp für bessere Performance:
# https://github.com/ggerganov/whisper.cpp
```

**Test:** `whisper --version`

---

## 🎨 Branding anpassen

### Logo hinzufügen

```bash
# Dein Logo kopieren (PNG mit transparentem Hintergrund)
copy C:\dein\pfad\logo.png assets\logo.png

# In .env aktivieren
BRAND_LOGO_PATH=./assets/logo.png
```

### Farben & Name ändern

In `.env`:
```env
BRAND_NAME="Dein SaaS Name"
BRAND_COLOR="#FF5733"
```

### Intro/Outro Videos (optional)

```bash
# Platziere deine Templates (jeweils 2-3 Sekunden, 1920x1080)
assets\intro-template.mp4
assets\outro-template.mp4
```

---

## 🌍 Mehrsprachige Videos

### Sprache umstellen

In `.env`:
```env
SUBTITLE_LANG=de   # Deutsch
# SUBTITLE_LANG=en   # English  
# SUBTITLE_LANG=ar   # العربية
```

### Flow-Texte anpassen

Bearbeite `config/translations.js`:
```javascript
de: {
  checkout_goto_products: 'Zur Produktübersicht',
  checkout_add_to_cart: 'In den Warenkorb legen',
  // ...
}
```

---

## ✏️ Eigenen Flow erstellen

### 1. Flow-Datei erstellen

```bash
# Kopiere eine Vorlage
copy tests\flows\checkout.spec.js tests\flows\mein-feature.spec.js
```

### 2. Flow anpassen

Öffne `tests/flows/mein-feature.spec.js`:

```javascript
const { test } = require('@playwright/test');
const { FlowRecorder } = require('../utils/flow-recorder');

test.describe('Mein Feature Flow', () => {
  let recorder;

  test.beforeEach(async ({ page }) => {
    recorder = new FlowRecorder(page, 'mein-feature');
    await recorder.start();
  });

  test('Feature demonstration', async ({ page }) => {
    // Schritt 1
    await recorder.step('Zur Feature-Seite navigieren', async () => {
      await page.goto('/my-feature');
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Schritt 2
    await recorder.step('Aktion ausführen', async () => {
      await page.click('[data-test="my-button"]');
      await recorder.pause(1500);
    });

    // Schritt 3
    await recorder.step('Ergebnis prüfen', async () => {
      await page.waitForSelector('.success-message');
      await recorder.pause(2000);
    });

    await recorder.finish();
  });
});
```

### 3. Video erstellen

```bash
npm run record mein-feature
npm run process mein-feature
npm run howto mein-feature
```

---

## 🐛 Troubleshooting

### ❌ "Cannot find module '@playwright/test'"
```bash
npm install
npm run install:browsers
```

### ❌ "ffmpeg: command not found"
```bash
# Windows
choco install ffmpeg

# Oder manuell von https://ffmpeg.org/download.html
# Zu PATH hinzufügen!
```

### ❌ "No videos in output/"
1. Prüfe ob Recording erfolgreich war (grüne Ausgabe)
2. Schaue in `test-results/` nach .webm Dateien
3. Wenn vorhanden: `npm run process <feature-name>`

### ❌ Flow bricht ab / ist instabil
- **Lösung 1:** Erhöhe Wartezeiten
  ```javascript
  await recorder.pause(3000);  // statt 1000
  ```
- **Lösung 2:** Bessere Selectors verwenden
  ```javascript
  // ❌ Schlecht
  await page.click('button');
  
  // ✅ Gut
  await page.click('[data-test="submit-button"]');
  ```
- **Lösung 3:** Mehr Zeit für Laden
  ```javascript
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  ```

### ❌ Video-Qualität schlecht
```env
# In .env erhöhen
VIDEO_BITRATE=3500k  # statt 2500k
VIDEO_FPS=60         # statt 30
```

### ❌ Dateigröße zu groß
```env
# In .env reduzieren
VIDEO_BITRATE=1800k
VIDEO_FPS=24
```

---

## 📚 Dokumentation

| Datei | Inhalt |
|-------|--------|
| **PROJECT_OVERVIEW.md** | Diese Datei - Übersicht & Start |
| **README.md** | Vollständige technische Dokumentation |
| **QUICKSTART.md** | Schnelleinstieg (1 Seite) |
| **CI-INTEGRATION.md** | GitHub Actions, GitLab CI, Jenkins, Azure |
| **ADVANCED_FEATURES.md** | Cursor-Highlight, Zoom, Voice-Over, etc. |

---

## 🎯 Nächste Schritte

### ✅ Sofort loslegen
```bash
setup.bat
test-pipeline.bat
```

### ✅ Für Produktion vorbereiten
1. ✅ `.env` mit echten Demo-Daten füllen
2. ✅ Logo in `assets/logo.png` platzieren
3. ✅ Flows an deine App anpassen (URLs, Selectors)
4. ✅ ffmpeg installieren
5. ✅ Erstes Video testen
6. ✅ Alle Videos generieren

### ✅ Automatisieren (CI/CD)
1. Schaue in `CI-INTEGRATION.md`
2. Wähle deine CI-Platform (GitHub Actions empfohlen)
3. Kopiere Workflow-Template
4. Secrets konfigurieren (DEMO_EMAIL, DEMO_PASSWORD, etc.)
5. Videos automatisch bei jedem Release neu generieren

---

## 💡 Pro-Tipps

### 🎬 Bessere Videos
- **Nutze stabile Test-Daten** - Keine zufälligen Namen/Emails
- **Langsame Aktionen** - `slowMo: 500` in playwright.config.js
- **Klare Schritte** - Jeder Step = 1 Aktion
- **Pausen nutzen** - Zuschauer brauchen Zeit zum Verstehen

### 🚀 Performance
- **Parallele Aufnahme** - `npm run record:all` (3 Videos gleichzeitig)
- **Batch-Processing** - `npm run process:all`
- **CI-optimiert** - Container-basiert, schnell

### 🌍 Multi-Language
- **3 Sprachen fertig** - de, en, ar
- **Einfach erweitern** - `config/translations.js` bearbeiten
- **Untertitel** - Automatisch mit Whisper (optional)

---

## 📊 Zusammenfassung

### ✅ Was du bekommst:
- **3 fertige Flows** - Login, Checkout, Products
- **1-Command-Videos** - `npm run howto checkout`
- **CI/CD-ready** - GitHub Actions, GitLab CI, etc.
- **Multi-Language** - de/en/ar support
- **Professionell** - 1080p, Branding, Untertitel

### ✅ Deine Vorteile:
- **Keine manuelle Arbeit** - Komplett automatisiert
- **Reproduzierbar** - Immer gleiche Qualität
- **Skalierbar** - 10 oder 100 Videos, kein Problem
- **Kostenlos** - Alles Open Source Tools
- **Lokal** - Keine Cloud-Dependencies

### ✅ Output:
- **MP4-Videos** - 1080p @ 30fps
- **Kleine Dateien** - ~5MB pro Minute
- **Mit Branding** - Logo, Intro, Outro
- **Untertitel** - Optional, mehrsprachig

---

## 🎉 Los geht's!

```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend\video-automation
setup.bat
```

**Viel Erfolg mit deinen automatisierten How-to Videos! 🚀**


# 🎬 SaaS Video Automation Pipeline

Vollautomatische How-to Video-Erstellung für dein SaaS - komplett lokal, reproduzierbar und CI-fähig.

## 🚀 Quick Start

```bash
# 1. Setup (einmalig)
npm install
npm run install:browsers
cp .env.example .env
# Bearbeite .env mit deinen Einstellungen

# 2. Video erstellen (komplett automatisch)
make howto FEATURE=checkout
# oder
npm run howto checkout

# 3. Fertig! Video ist in ./output/HOWTO_checkout_FINAL.mp4
```

## 📁 Projekt-Struktur

```
video-automation/
├── package.json              # Dependencies
├── playwright.config.js      # Playwright Konfiguration
├── .env                      # Deine Einstellungen (nicht committen!)
├── Makefile                  # Einfache Build-Commands
│
├── tests/
│   ├── flows/               # Deine Flow-Definitionen
│   │   ├── login.spec.js    # Login-Flow
│   │   ├── checkout.spec.js # Checkout-Flow
│   │   └── products.spec.js # Produkt-Browse Flow
│   └── utils/
│       └── flow-recorder.js # Flow-Recording Utility
│
├── scripts/
│   ├── record-single.js     # Flow aufnehmen
│   ├── process-video.js     # Video verarbeiten
│   ├── build-howto.js       # Finales Video bauen
│   └── clean.js             # Aufräumen
│
├── assets/                  # Branding Assets
│   ├── logo.png            # Dein Logo
│   ├── intro-template.mp4  # Intro (optional)
│   └── outro-template.mp4  # Outro (optional)
│
├── output/                  # Generierte Videos (gitignored)
└── test-results/           # Playwright Aufnahmen (gitignored)
```

## 🎯 Features

### 1️⃣ Playwright Demo Runner
- ✅ Stabile, deterministische Flows
- ✅ Automatische Video-Aufnahme (1080p, 30fps)
- ✅ Visuelle Step-Indicator im Video
- ✅ Kein "flaky" Verhalten durch smarte Waits
- ✅ Fixtures für konsistente Demo-Daten

### 2️⃣ Video Post-Processing
- ✅ Automatisches Trimming (ffmpeg)
- ✅ Video-Optimierung (H.264, kleine Dateigröße)
- ✅ Intro/Outro automatisch
- ✅ Audio-Normalisierung
- ✅ Lower Thirds (Feature-Namen)

### 3️⃣ Untertitel-Generation
- ✅ Whisper-Integration (lokal)
- ✅ Automatische SRT/VTT Generierung
- ✅ Multi-Language Support (de/en/ar)
- ✅ Untertitel-Einbrennen oder separate Datei

### 4️⃣ Branding & Templates
- ✅ Logo-Overlay
- ✅ Farbschema anpassbar
- ✅ Intro/Outro Templates
- ✅ Text/Sprache zentral konfigurierbar

## 🛠️ Installation

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn
- ffmpeg (für Video-Processing)

#### ffmpeg Installation (Windows)
```bash
# Mit Chocolatey
choco install ffmpeg

# Oder Download von: https://ffmpeg.org/download.html
# Füge ffmpeg.exe zu PATH hinzu
```

#### Whisper Installation (Optional - für Auto-Untertitel)
```bash
# Python + Whisper
pip install openai-whisper

# Oder whisper.cpp für bessere Performance:
# https://github.com/ggerganov/whisper.cpp
```

### Setup
```bash
cd video-automation
npm install
npm run install:browsers

# Konfiguration
cp .env.example .env
# Bearbeite .env mit deinen Werten
```

## 📝 .env Konfiguration

```env
# Basis-URL (lokal oder staging)
BASE_URL=http://localhost:4200

# Demo-Credentials (stabiler Test-User)
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=DemoPass123!

# Video-Einstellungen
VIDEO_WIDTH=1920
VIDEO_HEIGHT=1080
VIDEO_FPS=30
VIDEO_BITRATE=2500k

# Sprache für Untertitel
SUBTITLE_LANG=de

# Branding
BRAND_NAME="Markt-MA"
BRAND_COLOR="#0066cc"
BRAND_LOGO_PATH=./assets/logo.png

# Whisper Model (tiny/base/small/medium/large)
WHISPER_MODEL=base
```

## 🎬 Flows erstellen

### Neuen Flow hinzufügen

1. Erstelle `tests/flows/mein-feature.spec.js`:

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
    // Step 1: Navigate
    await recorder.step('Zur Feature-Seite', async () => {
      await page.goto('/feature');
      await page.waitForLoadState('networkidle');
      await recorder.pause(2000);
    });

    // Step 2: Aktion
    await recorder.step('Button klicken', async () => {
      const button = page.locator('[data-test="my-button"]');
      await button.click();
      await recorder.pause(1500);
    });

    // Step 3: Verifizierung
    await recorder.step('Erfolg prüfen', async () => {
      await page.waitForSelector('.success-message');
      await recorder.pause(2000);
    });

    await recorder.finish();
  });
});
```

2. Flow aufnehmen:
```bash
npm run record mein-feature
```

## 🔧 Commands

### Einzelne Schritte

```bash
# 1. Flow aufnehmen
npm run record checkout
# oder
make record FEATURE=checkout

# 2. Video verarbeiten
npm run process checkout
# oder
make process FEATURE=checkout

# 3. Finales Video bauen
npm run howto checkout
# oder
make howto FEATURE=checkout
```

### Kompletter Workflow (All-in-One)

```bash
# Alles auf einmal
make all FEATURE=checkout

# Oder für mehrere Features
make all FEATURE=login
make all FEATURE=checkout
make all FEATURE=products
```

### Aufräumen

```bash
npm run clean
# oder
make clean
```

## 🌍 Multi-Language Support

### Sprache ändern

1. In `.env`:
```env
SUBTITLE_LANG=en  # oder de, ar, etc.
```

2. Flow-Texte anpassen in `tests/flows/*.spec.js`:
```javascript
// Deutsch
await recorder.step('Zur Kasse gehen', async () => { ... });

// Englisch
await recorder.step('Go to checkout', async () => { ... });

// Arabisch
await recorder.step('انتقل إلى الدفع', async () => { ... });
```

## 🎨 Branding anpassen

### Logo ändern
```bash
# Füge dein Logo hinzu
cp /pfad/zu/logo.png assets/logo.png

# In .env
BRAND_LOGO_PATH=./assets/logo.png
```

### Farben ändern
```env
BRAND_COLOR="#0066cc"  # Hex-Code
```

### Intro/Outro Templates
```bash
# Platziere deine Templates
assets/intro-template.mp4
assets/outro-template.mp4

# Werden automatisch verwendet wenn vorhanden
```

## 🚀 CI/CD Integration

### GitHub Actions Beispiel

```yaml
name: Generate How-to Videos

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  generate-videos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        working-directory: video-automation
        run: |
          npm install
          npm run install:browsers
          sudo apt-get install -y ffmpeg
      
      - name: Generate videos
        working-directory: video-automation
        run: |
          make all FEATURE=login
          make all FEATURE=checkout
      
      - name: Upload videos
        uses: actions/upload-artifact@v3
        with:
          name: howto-videos
          path: video-automation/output/HOWTO_*.mp4
```

## 📊 Video-Qualität optimieren

### Dateigröße reduzieren
```env
VIDEO_BITRATE=1800k  # Niedriger = kleiner
```

### Bessere Qualität
```env
VIDEO_BITRATE=3500k  # Höher = besser
VIDEO_FPS=60         # Flüssiger
```

### Balance (empfohlen)
```env
VIDEO_BITRATE=2500k
VIDEO_FPS=30
VIDEO_WIDTH=1920
VIDEO_HEIGHT=1080
```

## 🐛 Troubleshooting

### Video wird nicht aufgenommen
```bash
# Browser neu installieren
npm run install:browsers -- --force

# Oder manuell Chromium installieren
npx playwright install chromium
```

### ffmpeg nicht gefunden
```bash
# Windows
choco install ffmpeg

# Linux/Mac
sudo apt-get install ffmpeg  # Linux
brew install ffmpeg          # Mac
```

### Flow ist "flaky"
- Erhöhe `slowMo` in `playwright.config.js`
- Verwende `await recorder.pause()` nach wichtigen Aktionen
- Nutze `waitForLoadState('networkidle')` vor Checks

### Video-Qualität schlecht
- Erhöhe `VIDEO_BITRATE` in `.env`
- Prüfe Display-Skalierung (sollte 100% sein)
- Verwende stabile Test-Daten ohne zufällige Elemente

## 📚 Best Practices

### 1. Stabile Demo-Daten
```javascript
// ❌ Schlecht: Zufällige Daten
const randomEmail = `user${Math.random()}@test.com`;

// ✅ Gut: Feste Demo-Daten
const demoEmail = process.env.DEMO_EMAIL;
```

### 2. Deterministische UI
```javascript
// ✅ Warte auf vollständiges Laden
await page.waitForLoadState('networkidle');

// ✅ Warte auf spezifische Elemente
await page.waitForSelector('.product-card');

// ✅ Scroll-Verhalten kontrollieren
await element.scrollIntoViewIfNeeded();
```

### 3. Visuelle Pausen
```javascript
// Nach wichtigen Aktionen
await recorder.pause(2000);

// Nach Navigation
await page.waitForLoadState('networkidle');
await recorder.pause(1500);
```

### 4. Beschreibende Steps
```javascript
// ✅ Klar und beschreibend
await recorder.step('Produkt in den Warenkorb legen', async () => {
  // ...
});

// ❌ Zu technisch
await recorder.step('Click button', async () => {
  // ...
});
```

## 🎯 Roadmap

- [ ] Whisper Integration (lokale Untertitel-Generierung)
- [ ] Cursor-Highlighting
- [ ] Zoom-In für wichtige Klicks
- [ ] Template-System für Intro/Outro
- [ ] Multi-Browser Support
- [ ] A/B Test verschiedener Flows
- [ ] Analytics-Integration (welche Videos funktionieren?)

## 📄 Lizenz

MIT

## 🤝 Support

Bei Fragen oder Problemen:
1. Prüfe die [Troubleshooting](#-troubleshooting) Sektion
2. Schaue in die Playwright Docs: https://playwright.dev
3. Öffne ein Issue im Repository

---

**Made with ❤️ for automated, repeatable, and high-quality How-to videos**


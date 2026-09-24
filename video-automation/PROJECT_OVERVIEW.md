# 📋 Video Automation - Projektübersicht

## ✅ Was wurde erstellt?

### 📂 Ordner-Struktur

```
video-automation/
├── 📄 package.json                 # Dependencies & Scripts
├── 📄 playwright.config.js         # Playwright Konfiguration
├── 📄 .env.example                 # Konfigurations-Template
├── 📄 .gitignore                   # Git-Ignore Regeln
├── 📄 Makefile                     # Build-Commands
├── 📄 README.md                    # Vollständige Dokumentation
├── 📄 QUICKSTART.md                # Schnelleinstieg
├── 📄 CI-INTEGRATION.md            # CI/CD Setup-Guides
├── 📄 ADVANCED_FEATURES.md         # Erweiterte Features
├── 🔧 setup.bat                    # Windows-Setup-Script
├── 🔧 test-pipeline.bat            # Quick-Test-Script
│
├── 📁 tests/
│   ├── flows/                      # Deine Flow-Definitionen
│   │   ├── login.spec.js          # ✅ Login-Flow (fertig)
│   │   ├── checkout.spec.js       # ✅ Checkout-Flow (fertig)
│   │   └── products.spec.js       # ✅ Produkt-Browse (fertig)
│   └── utils/
│       └── flow-recorder.js       # ✅ Recording-Utility
│
├── 📁 scripts/                     # Automation-Scripts
│   ├── record-single.js           # Einzelnen Flow aufnehmen
│   ├── record-all.js              # Alle Flows aufnehmen
│   ├── process-video.js           # Video verarbeiten (ffmpeg)
│   ├── process-all.js             # Alle Videos verarbeiten
│   ├── generate-subtitles.js     # Untertitel mit Whisper
│   ├── build-howto.js             # Finales Video bauen
│   └── clean.js                   # Aufräumen
│
├── 📁 config/
│   └── translations.js            # 🌍 Multi-Language (de/en/ar)
│
├── 📁 assets/                      # Branding-Assets
│   └── README.md                  # Asset-Anleitung
│
└── 📁 output/                      # 🎬 Generierte Videos (gitignored)
```

## 🚀 Sofort loslegen

### 1. Installation (5 Minuten)

```bash
cd C:\Users\t13016a\Downloads\Team2\storeBackend\video-automation

# Automatisches Setup (empfohlen)
setup.bat

# Oder manuell
npm install
npm run install:browsers
copy .env.example .env
```

### 2. Konfiguration (.env)

```env
BASE_URL=http://localhost:4200
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=DemoPass123!
BRAND_NAME="Markt-MA"
VIDEO_WIDTH=1920
VIDEO_HEIGHT=1080
SUBTITLE_LANG=de
```

### 3. Erstes Video erstellen

```bash
# Quick-Test (komplett automatisch)
test-pipeline.bat

# Oder Schritt für Schritt
npm run record checkout
npm run process checkout
npm run howto checkout
```

**➡️ Fertig!** Video ist in `output/HOWTO_checkout_FINAL.mp4`

## 🎯 Verfügbare Flows

### ✅ Login-Flow (login.spec.js)
- Homepage besuchen
- Login-Button klicken
- Credentials eingeben
- Anmelden
- Erfolg verifizieren

### ✅ Checkout-Flow (checkout.spec.js)
- Produkte durchsuchen
- Produkt auswählen
- In Warenkorb legen
- Zur Kasse gehen
- Versanddaten eingeben
- Zahlungsmethode wählen
- Bestellung abschließen

### ✅ Produkt-Browse-Flow (products.spec.js)
- Produktübersicht öffnen
- Kategorie filtern
- Produktdetails ansehen
- Bilder durchsehen
- Beschreibung lesen
- Ähnliche Produkte

## 🛠️ Commands

### Recording
```bash
npm run record checkout        # Einzelnen Flow
npm run record:all            # Alle Flows
npm run record:login          # Login-Flow
npm run record:checkout       # Checkout-Flow
npm run record:products       # Products-Flow
```

### Processing
```bash
npm run process checkout      # Einzelnes Video
npm run process:all          # Alle Videos
```

### Subtitles (Optional - benötigt Whisper)
```bash
npm run subtitles output/checkout_processed.mp4
```

### Final Build
```bash
npm run howto checkout        # Finales Video bauen
```

### Komplette Pipeline
```bash
# Alles in einem
npm run pipeline:full         # Record + Process all
# Dann für jedes Feature:
npm run howto login
npm run howto checkout
npm run howto products
```

### Cleanup
```bash
npm run clean                 # Aufräumen
```

## 📊 Features

### ✅ Demo Runner (Playwright)
- **Stabil & deterministisch** - Keine flaky Tests
- **Video-Aufnahme** - Automatisch 1080p @ 30fps
- **Smart Waits** - networkidle, element-based
- **Visual Steps** - Overlay-Indicator im Video
- **SlowMo** - Aktionen verlangsamt für Zuschauer

### ✅ Video Post-Processing (ffmpeg)
- **Automatisches Trimming** - Start/Ende optimiert
- **Video-Optimierung** - H.264, kleine Dateigröße
- **Intro/Outro** - Automatisch mit Branding
- **Audio-Normalisierung** - Konsistente Lautstärke
- **Lower Thirds** - Feature-Namen als Overlay

### ✅ Untertitel (Whisper)
- **Auto-Generierung** - Mit OpenAI Whisper
- **Multi-Language** - de, en, ar support
- **SRT + VTT** - Beide Formate
- **Einbrennen** - Optional ins Video

### ✅ Branding & Templates
- **Logo-Overlay** - Dein Logo im Video
- **Farbschema** - Anpassbar per .env
- **Intro/Outro** - Template-basiert
- **Multi-Language** - Texte zentral konfigurierbar

### ✅ CI/CD Ready
- **GitHub Actions** - Workflow-Templates fertig
- **GitLab CI** - Pipeline-Config vorhanden
- **Jenkins** - Jenkinsfile included
- **Azure DevOps** - Pipeline-YAML ready
- **Docker** - Dockerfile.ci vorhanden

## 🌍 Multi-Language

Ändere einfach `SUBTITLE_LANG` in `.env`:

```env
SUBTITLE_LANG=de   # Deutsch
SUBTITLE_LANG=en   # English
SUBTITLE_LANG=ar   # العربية
```

Flow-Texte sind in `config/translations.js` definiert.

## 🎨 Branding anpassen

### Logo hinzufügen
```bash
# Dein Logo kopieren
copy C:\path\to\logo.png assets\logo.png

# In .env referenzieren
BRAND_LOGO_PATH=./assets/logo.png
```

### Farben ändern
```env
BRAND_COLOR=#0066cc
BRAND_NAME="Markt-MA"
```

### Intro/Outro (optional)
```bash
# Templates hinzufügen
assets\intro-template.mp4
assets\outro-template.mp4
```

## 📦 Abhängigkeiten

### Node.js Packages
- `@playwright/test` - Browser-Automation & Recording
- `fluent-ffmpeg` - Video-Processing
- `whisper-node` - Untertitel-Generierung
- `dotenv` - Konfiguration

### System Requirements
- **Node.js 18+**
- **ffmpeg** - Video-Processing
  ```bash
  choco install ffmpeg  # Windows
  ```
- **Whisper** (optional) - Auto-Subtitles
  ```bash
  pip install openai-whisper
  ```

## 🎓 Neuen Flow erstellen

### 1. Flow-Datei erstellen

Kopiere `tests/flows/checkout.spec.js` und benenne um:
```bash
copy tests\flows\checkout.spec.js tests\flows\mein-feature.spec.js
```

### 2. Flow anpassen

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
    await recorder.step('Schritt 1', async () => {
      await page.goto('/meine-seite');
      await recorder.pause(2000);
    });

    await recorder.step('Schritt 2', async () => {
      await page.click('[data-test="mein-button"]');
      await recorder.pause(1500);
    });

    await recorder.finish();
  });
});
```

### 3. Aufnehmen

```bash
npm run record mein-feature
npm run process mein-feature
npm run howto mein-feature
```

## 🐛 Troubleshooting

### "Playwright not found"
```bash
npm run install:browsers
```

### "ffmpeg not found"
```bash
choco install ffmpeg
# Oder von https://ffmpeg.org/download.html
```

### "No videos generated"
1. Prüfe ob Recording erfolgreich war
2. Schaue in `test-results/` nach .webm Dateien
3. Prüfe Logs für Fehler

### Flow ist instabil
- Erhöhe Pausen: `await recorder.pause(3000)`
- Verwende `waitForLoadState('networkidle')`
- Nutze stabile Selectors: `[data-test="..."]`

### Video-Qualität schlecht
```env
VIDEO_BITRATE=3500k  # Höher = besser (aber größer)
VIDEO_FPS=60         # Flüssiger
```

### Dateigröße zu groß
```env
VIDEO_BITRATE=1800k  # Niedriger = kleiner
VIDEO_FPS=24         # Ausreichend
```

## 📚 Dokumentation

- **README.md** - Vollständige Dokumentation
- **QUICKSTART.md** - Schnelleinstieg
- **CI-INTEGRATION.md** - CI/CD Setup
- **ADVANCED_FEATURES.md** - Erweiterte Features
  - Cursor Highlighting
  - Zoom-In Effects
  - Voice-Over
  - Lower Thirds
  - Multi-Angle Recording

## 🎯 Best Practices

1. **Stabile Test-Daten** - Nutze feste Demo-User
2. **Deterministische UI** - Keine zufälligen Elemente
3. **Smart Waits** - networkidle statt feste Timeouts
4. **Beschreibende Steps** - Klar & verständlich
5. **Pausen nutzen** - Zuschauer brauchen Zeit
6. **Separate Demo-Umgebung** - Nicht auf Production

## 🚀 Nächste Schritte

### Sofort nutzbar
```bash
setup.bat
test-pipeline.bat
```

### Produktiv einsetzen
1. ✅ .env mit echten Demo-Daten füllen
2. ✅ Logo in assets/ platzieren
3. ✅ Flows an deine App anpassen
4. ✅ Videos generieren
5. ✅ Auf Website/YouTube veröffentlichen

### CI/CD integrieren
1. Schaue in `CI-INTEGRATION.md`
2. Wähle deine CI-Platform
3. Kopiere Workflow-Template
4. Secrets konfigurieren
5. Automatisch neue Videos bei Releases

## 💡 Prioritäten (wie gewünscht)

✅ **Komplett lokal ausführbar** - Keine Cloud-Dependencies  
✅ **Wiederholbar & stabil** - Deterministische Flows  
✅ **CI-fähig** - GitHub Actions, GitLab CI, Jenkins ready  
✅ **Gute Videoqualität** - 1080p @ 30fps, optimiert  
✅ **Kleine Dateigröße** - H.264 mit 2.5Mbps (~5MB/Min)  
✅ **Free Tools** - Playwright, ffmpeg, Whisper (Open Source)

## 📞 Support

Bei Fragen:
1. Schaue in README.md (ausführlich)
2. Prüfe QUICKSTART.md (Schnelleinstieg)
3. Troubleshooting-Sektion in README.md

---

**🎉 Viel Erfolg mit deinen automatisierten How-to Videos!**


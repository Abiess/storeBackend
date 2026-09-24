# 🎯 Quick Start Guide

## 1. Installation (einmalig - 5 Minuten)

```bash
# Windows
cd C:\Users\t13016a\Downloads\Team2\storeBackend\video-automation
setup.bat

# Oder manuell:
npm install
npm run install:browsers
copy .env.example .env
```

## 2. Konfiguration (2 Minuten)

Bearbeite `.env`:
```env
BASE_URL=http://localhost:4200
DEMO_EMAIL=demo@example.com
DEMO_PASSWORD=DemoPass123!
BRAND_NAME="Markt-MA"
SUBTITLE_LANG=de
```

## 3. Erstes Video erstellen (1 Befehl!)

```bash
# Windows
test-pipeline.bat

# Oder über npm:
npm run record checkout
npm run process checkout
npm run howto checkout
```

**Fertig!** Video ist in: `output/HOWTO_checkout_FINAL.mp4`

## 4. Weitere Flows

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

## Alle Videos auf einmal

```bash
npm run record:all
npm run process:all
# Dann für jedes Feature:
npm run howto login
npm run howto checkout
npm run howto products
```

## Eigenen Flow erstellen

1. Kopiere `tests/flows/checkout.spec.js`
2. Benenne um zu `mein-feature.spec.js`
3. Passe die Steps an
4. Aufnehmen: `npm run record mein-feature`

## Troubleshooting

### "Playwright not found"
```bash
npm run install:browsers
```

### "ffmpeg not found"
```bash
choco install ffmpeg
```

### "Keine Videos in output/"
1. Prüfe ob Recording erfolgreich war
2. Schaue in `test-results/` nach .webm Dateien
3. Führe `npm run process <feature>` aus

## Tipps

- **Stabile Demos**: Nutze feste Test-Daten (in .env)
- **Bessere Qualität**: Erhöhe VIDEO_BITRATE in .env
- **Kleinere Dateien**: Reduziere VIDEO_BITRATE in .env
- **Mehrsprachig**: Ändere SUBTITLE_LANG (de/en/ar)

## Support

Vollständige Doku: `README.md`
#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const flows = ['login', 'checkout', 'products'];

console.log('🎬 Recording all flows...');
console.log('═'.repeat(50));

flows.forEach((flow, index) => {
  console.log(`\n[${index + 1}/${flows.length}] Recording: ${flow}`);
  console.log('─'.repeat(50));
  
  try {
    execSync(`node ${path.join(__dirname, 'record-single.js')} ${flow}`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
  } catch (error) {
    console.error(`❌ Failed to record ${flow}`);
  }
});

console.log('\n═'.repeat(50));
console.log('✅ All recordings complete!');
console.log('\nNext: npm run process:all');


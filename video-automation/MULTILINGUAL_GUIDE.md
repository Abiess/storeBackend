# 🌍 Multilingual Video Automation Guide

## Überblick

Die Video-Automation unterstützt jetzt **mehrsprachige Tests** für alle 4 unterstützten Sprachen der markt.ma Plattform:

- 🇩🇪 **Deutsch** (de)
- 🇬🇧 **Englisch** (en)
- 🇫🇷 **Französisch** (fr)
- 🇸🇦 **Arabisch** (ar)

---

## 📁 Struktur

```
video-automation/
├── config/
│   └── translations.js          # Zentrale Übersetzungsdatei für alle Sprachen
├── tests/
│   └── demo/
│       ├── quick-start-multilang.spec.js   # Generisches mehrsprachiges Skript
│       └── boutique-sans-inscription.spec.js  # Original französisches Skript (deprecated)
└── MULTILINGUAL_GUIDE.md        # Diese Datei
```

---

## 🚀 Quick Start

### Alle Sprachen testen (empfohlen)

```powershell
# Alle 4 Sprachen nacheinander ausführen
npx playwright test quick-start-multilang
```

### Einzelne Sprache testen

```powershell
# Nur Deutsch
npx playwright test quick-start-multilang --grep "German"

# Nur Englisch
npx playwright test quick-start-multilang --grep "English"

# Nur Französisch
npx playwright test quick-start-multilang --grep "French"

# Nur Arabisch
npx playwright test quick-start-multilang --grep "Arabic"
```

### Mit Video-Aufnahme

```powershell
# Einzelne Sprache mit Video
npx playwright test quick-start-multilang --grep "French" --project=chromium

# Alle Sprachen mit Video (Achtung: lange Laufzeit!)
npx playwright test quick-start-multilang --project=chromium
```

---

## 📝 Wie funktioniert es?

### 1. Zentrale Übersetzungsdatei

Alle Texte sind in `config/translations.js` definiert:

```javascript
const { getAllTranslations } = require('../../config/translations');

// Im Test:
const t = getAllTranslations('de'); // Lädt deutsche Übersetzungen
await recorder.step(t.quick_landing, async () => {
  // t.quick_landing = "Homepage besuchen" (DE)
  // t.quick_landing = "Visit homepage" (EN)
  // t.quick_landing = "Visiter la page d'accueil" (FR)
  // etc.
});
```

### 2. Sprachspezifische UI-Selektoren

Das Skript verwendet **intelligente Selektoren**, die für jede Sprache funktionieren:

```javascript
const UI_SELECTORS = {
  de: {
    ctaButton: /shop.*erstellen|erstellen.*shop|kostenlos.*erstellen/i,
    createButton: /store.*erstellen|erstellen/i,
  },
  en: {
    ctaButton: /create.*shop|create.*store|get.*started/i,
    createButton: /create.*store|create/i,
  },
  fr: {
    ctaButton: /créer.*boutique|créer.*shop|commencer/i,
    createButton: /créer.*boutique|créer/i,
  },
  // ...
};
```

### 3. Fallback-Strategien

Wenn ein Button nicht gefunden wird, probiert das Skript mehrere Strategien:

1. **Sprachspezifischer Text** (z.B. "Shop erstellen", "Create shop")
2. **Icon-Selektor** (z.B. `lucide-icon[name="Pizza"]` - sprachunabhängig)
3. **CSS-Klasse** (z.B. `.primary-button`)
4. **Position** (z.B. 3. Button)

---

## 🎨 Neue Übersetzungen hinzufügen

### Schritt 1: `config/translations.js` erweitern

```javascript
const translations = {
  // Neue Sprache hinzufügen (z.B. Spanisch)
  es: {
    quick_landing: 'Visitar la página principal',
    quick_cta_click: 'Hacer clic en "Crear tienda"',
    quick_enter_name: 'Introducir nombre de la tienda',
    quick_select_type: 'Seleccionar tipo de negocio',
    quick_create_store: 'Crear tienda',
    quick_view_store: 'Ver tienda (Storefront)',
    quick_success: '¡Éxito! Tienda creada',
    // ... alle anderen Keys
  }
};
```

### Schritt 2: UI-Selektoren in `quick-start-multilang.spec.js` erweitern

```javascript
const UI_SELECTORS = {
  // ...
  es: {
    ctaButton: /crear.*tienda|empezar/i,
    createButton: /crear.*tienda|crear/i,
    viewStoreLink: /ver.*tienda|abrir.*tienda/i,
    nextButton: /siguiente|next/i,
  }
};

const BUSINESS_TYPE_SELECTORS = {
  text: {
    // ...
    es: /comida|restaurante|alimentos/i,
  },
  // ...
};
```

### Schritt 3: Test-Factory aufrufen

```javascript
test.describe('markt.ma - Quick Start (Multilingual)', () => {
  // ... bestehende Tests
  createQuickStartTest('es', '🇪🇸 Spanish');
});
```

---

## 🎬 Video-Output

Alle Videos werden nach Sprache benannt:

```
output/
├── quick-start-de-chromium/     # Deutsches Video
├── quick-start-en-chromium/     # Englisches Video
├── quick-start-fr-chromium/     # Französisches Video
└── quick-start-ar-chromium/     # Arabisches Video
```

---

## 🔧 Konfiguration

### Environment Variables

```bash
# .env Datei
BASE_URL=https://markt.ma
HEADLESS=false
VIDEO=true
```

### Playwright Config

```javascript
// playwright.config.js
use: {
  video: 'on',                    // Video immer aufnehmen
  screenshot: 'only-on-failure',  // Screenshots nur bei Fehler
  locale: 'de-DE',                // Standard-Locale (kann überschrieben werden)
}
```

---

## 🐛 Troubleshooting

### Problem: Button nicht gefunden

**Lösung:** Fallback-Strategien erweitern

```javascript
// In quick-start-multilang.spec.js
if (!await ctaButton.isVisible({ timeout: 2000 }).catch(() => false)) {
  // Weitere Fallbacks hinzufügen
  ctaButton = page.locator('[data-testid="cta-button"]').first();
}
```

### Problem: Arabische Texte werden nicht richtig angezeigt

**Lösung:** RTL (Right-to-Left) Support prüfen

```javascript
// Check if page is in RTL mode
const isRTL = await page.evaluate(() => 
  document.documentElement.dir === 'rtl'
);
console.log(`RTL Mode: ${isRTL}`);
```

### Problem: Videos werden nicht erstellt

**Lösung:** Playwright Config prüfen

```powershell
# Video-Einstellungen prüfen
Get-Content playwright.config.js | Select-String "video"

# Manuell mit --video Flag
npx playwright test --video=on
```

---

## 📊 Best Practices

### ✅ DO

- **Zentrale Übersetzungen verwenden**: Alle Texte in `translations.js`
- **Fallback-Strategien implementieren**: Mehrere Wege zum Finden von Elementen
- **Sprachspezifische Selektoren**: Regex für flexible Texterkennung
- **Icon-Selektoren als Fallback**: Lucide Icons sind sprachunabhängig

### ❌ DON'T

- **Hardcoded Texte**: Nie direkt im Test-Code
- **Nur ein Selektor**: Immer Fallbacks vorbereiten
- **Locale ignorieren**: RTL-Support für Arabisch beachten
- **Videos unkomprimiert lassen**: FFmpeg für Kompression nutzen

---

## 🎯 Nächste Schritte

1. **Weitere Flows hinzufügen**:
   - Login-Flow (mit Registrierung)
   - Checkout-Flow (Warenkorb → Bestellung)
   - Product-Browse-Flow (Produktkatalog durchsuchen)

2. **CI/CD Integration**:
   - GitHub Actions Workflow für automatische Tests
   - Nightly Builds für alle Sprachen
   - Video-Upload zu Cloud-Storage

3. **Analytics Integration**:
   - Test-Metriken tracken (Erfolgsrate, Dauer)
   - Video-Performance analysieren (Ladezeiten, Fehlerquoten)

---

## 📚 Weiterführende Dokumentation

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [i18n Testing Guide](https://playwright.dev/docs/test-i18n)
- [Video Recording](https://playwright.dev/docs/videos)

---

## 💡 Tipps

### Schnelleres Testing

```powershell
# Parallele Ausführung (Vorsicht: höhere Last)
npx playwright test quick-start-multilang --workers=4

# Nur Deutsch und Englisch (häufigste Sprachen)
npx playwright test quick-start-multilang --grep "German|English"
```

### Debug-Modus

```powershell
# Mit Playwright Inspector
npx playwright test quick-start-multilang --grep "French" --debug

# Mit Console-Logs
npx playwright test quick-start-multilang --grep "French" --headed
```

### Video-Postprocessing

```powershell
# Alle Videos komprimieren (FFmpeg erforderlich)
cd video-automation
npm run compress-videos

# Einzelnes Video komprimieren
ffmpeg -i output/quick-start-fr-chromium/video.webm -c:v libx264 -crf 23 output/quick-start-fr-compressed.mp4
```

---

## 🤝 Mitwirken

Neue Sprachen oder Verbesserungen? Pull Requests sind willkommen!

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/spanish-support`)
3. Commit deine Änderungen (`git commit -am 'Add Spanish translations'`)
4. Push zum Branch (`git push origin feature/spanish-support`)
5. Erstelle einen Pull Request

---

**Erstellt:** 2026-06-29  
**Version:** 1.0.0  
**Autor:** markt.ma Team


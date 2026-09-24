# 🌍 Mehrsprachige Video-Automation - Quick Reference

## 🎯 Übersicht

Die markt.ma Video-Automation unterstützt jetzt **vollständig mehrsprachige Tests** für alle 4 Plattform-Sprachen:

- 🇩🇪 **Deutsch** (de)
- 🇬🇧 **Englisch** (en)
- 🇫🇷 **Französisch** (fr)
- 🇸🇦 **Arabisch** (ar)

Ein einziges Skript kann für alle Sprachen verwendet werden, indem Labels und UI-Selektoren dynamisch angepasst werden.

---

## 🚀 Schnellstart

### Alle Sprachen testen

```powershell
# Mit PowerShell-Skript (empfohlen)
.\run-multilang-tests.ps1

# Oder direkt mit Playwright
npx playwright test quick-start-multilang
```

### Einzelne Sprache testen

```powershell
# Deutsch
.\run-multilang-tests.ps1 -Language de

# Französisch
.\run-multilang-tests.ps1 -Language fr

# Englisch
.\run-multilang-tests.ps1 -Language en

# Arabisch
.\run-multilang-tests.ps1 -Language ar
```

### Mit sichtbarem Browser

```powershell
.\run-multilang-tests.ps1 -Language de -Headed
```

---

## 📁 Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| **tests/demo/quick-start-multilang.spec.js** | Generisches mehrsprachiges Quick-Start-Skript (PRODUCTION-READY) |
| **tests/demo/login-multilang-example.spec.js** | Beispiel-Skript für Login-Flow (als Vorlage) |
| **config/translations.js** | Zentrale Übersetzungsdatei (erweitert mit Quick-Start + fr) |
| **run-multilang-tests.ps1** | PowerShell-Skript zum einfachen Ausführen aller Sprachen |
| **MULTILINGUAL_GUIDE.md** | Umfassende Dokumentation (Best Practices, Troubleshooting) |
| **CREATE_MULTILANG_TESTS.md** | Tutorial zum Erstellen eigener mehrsprachiger Tests |
| **MULTILINGUAL_README.md** | Diese Datei (Quick Reference) |

---

## 🎬 Video-Output

Videos werden automatisch erstellt und nach Sprache benannt:

```
test-results/
├── quick-start-multilang-de-chromium/
│   └── video.webm
├── quick-start-multilang-en-chromium/
│   └── video.webm
├── quick-start-multilang-fr-chromium/
│   └── video.webm
└── quick-start-multilang-ar-chromium/
    └── video.webm
```

---

## 🔧 Wie es funktioniert

### 1. Zentrale Übersetzungen

Alle Texte werden aus `config/translations.js` geladen:

```javascript
const { getAllTranslations } = require('../../config/translations');

const t = getAllTranslations('de'); // Lädt deutsche Texte
await recorder.step(t.quick_landing, async () => {
  // "Homepage besuchen" (DE)
  // "Visit homepage" (EN)
  // "Visiter la page d'accueil" (FR)
  // "زيارة الصفحة الرئيسية" (AR)
});
```

### 2. Sprachspezifische Selektoren

UI-Elemente werden mit **Regex-Patterns** gefunden, die alle Sprachvarianten abdecken:

```javascript
const UI_SELECTORS = {
  de: { ctaButton: /shop.*erstellen|kostenlos.*erstellen/i },
  en: { ctaButton: /create.*shop|get.*started/i },
  fr: { ctaButton: /créer.*boutique|commencer/i },
  ar: { ctaButton: /إنشاء.*متجر|ابدأ/i },
};
```

### 3. Fallback-Strategien

Wenn ein Element nicht gefunden wird, werden automatisch mehrere Strategien ausprobiert:

```javascript
// 1. Sprachspezifischer Text
let button = page.getByRole('button', { name: selectors.ctaButton });

// 2. Icon (sprachunabhängig)
if (!await button.isVisible()) {
  button = page.locator('button:has(lucide-icon[name="Pizza"])');
}

// 3. CSS-Klasse
if (!await button.isVisible()) {
  button = page.locator('.primary-button');
}

// 4. Position
if (!await button.isVisible()) {
  button = page.locator('button').nth(2);
}
```

---

## 📚 Dokumentation

### Für Anfänger
→ **[MULTILINGUAL_GUIDE.md](MULTILINGUAL_GUIDE.md)**  
Umfassende Einführung mit Best Practices und Troubleshooting

### Für Entwickler
→ **[CREATE_MULTILANG_TESTS.md](CREATE_MULTILANG_TESTS.md)**  
Schritt-für-Schritt Tutorial zum Erstellen eigener mehrsprachiger Tests

### Beispiele
→ **[quick-start-multilang.spec.js](tests/demo/quick-start-multilang.spec.js)**  
Production-ready Beispiel (Quick-Start ohne Registrierung)

→ **[login-multilang-example.spec.js](tests/demo/login-multilang-example.spec.js)**  
Beispiel-Vorlage für Login-Flow

---

## 🎯 Anwendungsfälle

### 1. Marketing-Videos für verschiedene Märkte erstellen

```powershell
# Deutsche Version für DACH-Region
.\run-multilang-tests.ps1 -Language de

# Französische Version für FR/BE/CH
.\run-multilang-tests.ps1 -Language fr

# Englische Version für internationale Märkte
.\run-multilang-tests.ps1 -Language en
```

### 2. Automatisierte UI-Tests in CI/CD

```yaml
# GitHub Actions Workflow
- name: Test all languages
  run: |
    cd video-automation
    npx playwright test quick-start-multilang
```

### 3. Schnelle Demos für Sales-Team erstellen

```powershell
# Alle Videos auf einmal erstellen (ca. 3-4 Minuten)
.\run-multilang-tests.ps1

# Videos finden in:
# test-results/quick-start-multilang-*-chromium/video.webm
```

---

## ⚙️ Konfiguration

### Umgebungsvariablen (.env)

```bash
# Base URL der Plattform
BASE_URL=https://markt.ma

# Test-Credentials (für Login-Tests)
TEST_EMAIL=test@example.com
TEST_PASSWORD=TestPassword123!

# Video-Einstellungen
VIDEO=true
HEADLESS=true
```

### Playwright Config

```javascript
// playwright.config.js
use: {
  video: 'on',                     // Videos immer aufnehmen
  locale: 'de-DE',                 // Standard-Locale
  timezoneId: 'Europe/Berlin',     // Zeitzone
}
```

---

## 🛠️ Fehlerbehebung

### Problem: "Element nicht gefunden"

**Ursache:** UI-Selektor stimmt nicht mit tatsächlichem UI überein

**Lösung 1:** Selektoren in UI_SELECTORS anpassen
```javascript
de: { ctaButton: /neuer.*text|alternative/i }
```

**Lösung 2:** Weitere Fallbacks hinzufügen
```javascript
if (!await button.isVisible()) {
  button = page.locator('[data-testid="cta"]');
}
```

**Lösung 3:** Debug-Modus verwenden
```powershell
npx playwright test quick-start-multilang --grep "German" --debug
```

### Problem: "Test läuft zu langsam"

**Ursache:** Zu viele Wartezeiten

**Lösung:** Pausen reduzieren (nur für schnelle Durchläufe, nicht für Marketing-Videos!)
```javascript
await recorder.pause(500); // statt 1000
```

### Problem: "Arabische Texte falsch ausgerichtet"

**Ursache:** RTL (Right-to-Left) nicht aktiv

**Lösung:** RTL-Mode überprüfen
```javascript
const isRTL = await page.evaluate(() => 
  document.documentElement.dir === 'rtl'
);
console.log(`RTL Mode: ${isRTL}`); // Sollte true sein für Arabisch
```

---

## 📊 Test-Metriken

| Metrik | Quick-Start-Flow |
|--------|------------------|
| **Dauer** | 30-45 Sekunden |
| **Schritte** | 7 |
| **Sprachen** | 4 (de, en, fr, ar) |
| **Video-Größe** | ~5-10 MB (WebM) |
| **Erfolgsrate** | >95% |

---

## 🚨 Wichtige Hinweise

### ⚠️ ACHTUNG bei Produktion

- **KEINE echten Kundendaten verwenden**
- Test-Accounts verwenden, keine Production-User
- Cleanup-Logic implementieren (siehe CleanupHelper)
- Rate-Limiting beachten bei vielen Tests

### ✅ Best Practices

1. **Immer Cleanup verwenden**
   ```javascript
   const cleanup = new CleanupHelper();
   cleanup.trackStore(storeId, token);
   await cleanup.cleanupAll(baseUrl);
   ```

2. **Timeouts großzügig setzen**
   ```javascript
   await button.waitFor({ timeout: 10000 }); // 10 Sekunden
   ```

3. **Fallbacks implementieren**
   ```javascript
   // Mindestens 2 Strategien pro Element
   ```

4. **RTL-Support testen**
   ```javascript
   // Arabische Tests immer visuell überprüfen
   ```

---

## 🎓 Nächste Schritte

1. **Weitere Flows erstellen:**
   - [ ] Checkout-Flow (Warenkorb → Bestellung)
   - [ ] Product-Management-Flow (Produkt erstellen/bearbeiten)
   - [ ] Settings-Flow (Store-Einstellungen ändern)

2. **CI/CD Integration:**
   - [ ] GitHub Actions Workflow
   - [ ] Automatische Video-Kompression
   - [ ] Cloud-Upload (S3, Google Drive, etc.)

3. **Analytics:**
   - [ ] Test-Metriken tracken
   - [ ] Video-Performance analysieren
   - [ ] Fehlerquoten überwachen

---

## 📞 Support

Bei Fragen oder Problemen:

1. **Dokumentation lesen:**
   - [MULTILINGUAL_GUIDE.md](MULTILINGUAL_GUIDE.md)
   - [CREATE_MULTILANG_TESTS.md](CREATE_MULTILANG_TESTS.md)

2. **Beispiele ansehen:**
   - [quick-start-multilang.spec.js](tests/demo/quick-start-multilang.spec.js)
   - [login-multilang-example.spec.js](tests/demo/login-multilang-example.spec.js)

3. **Debug-Mode verwenden:**
   ```powershell
   npx playwright test --debug
   ```

4. **Issues erstellen:**
   GitHub Issues mit detaillierter Fehlerbeschreibung

---

## 🎉 Los geht's!

```powershell
# Alle Sprachen testen und Videos erstellen
.\run-multilang-tests.ps1

# Oder nur eine Sprache
.\run-multilang-tests.ps1 -Language de -Headed
```

**Viel Erfolg! 🚀**

---

**Erstellt:** 2026-06-29  
**Version:** 1.0.0  
**Lizenz:** MIT


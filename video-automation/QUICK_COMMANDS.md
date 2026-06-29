# 🚀 Schnellreferenz - Mehrsprachige Video-Automation

## 📋 Übersicht

Das mehrsprachige Skript unterstützt **4 Sprachen** (de, en, fr, ar) und kann im **headed** (sichtbarer Browser) oder **headless** Modus ausgeführt werden.

---

## 🎯 PowerShell-Wrapper (Empfohlen)

### Einzelne Sprache - Headless (Standard)

```powershell
# Deutsch
.\run-multilang-tests.ps1 -Language de

# Englisch
.\run-multilang-tests.ps1 -Language en

# Französisch
.\run-multilang-tests.ps1 -Language fr

# Arabisch
.\run-multilang-tests.ps1 -Language ar
```

### Einzelne Sprache - Headed (Sichtbarer Browser)

```powershell
# Deutsch im sichtbaren Browser
.\run-multilang-tests.ps1 -Language de -Headed

# Französisch im sichtbaren Browser
.\run-multilang-tests.ps1 -Language fr -Headed

# Englisch im sichtbaren Browser
.\run-multilang-tests.ps1 -Language en -Headed

# Arabisch im sichtbaren Browser
.\run-multilang-tests.ps1 -Language ar -Headed
```

### Alle Sprachen

```powershell
# Alle 4 Sprachen - Headless (für CI/CD)
.\run-multilang-tests.ps1

# Alle 4 Sprachen - Headed (zum Debuggen)
.\run-multilang-tests.ps1 -Headed
```

### Debug-Modus (mit Playwright Inspector)

```powershell
# Deutsch mit Inspector
.\run-multilang-tests.ps1 -Language de -UseDebugger

# Französisch mit Inspector
.\run-multilang-tests.ps1 -Language fr -UseDebugger
```

---

## 🎬 Direkter Playwright-Aufruf

### Headless (Standard)

```powershell
# Deutsch
npx playwright test quick-start-multilang --grep "German" --project=chromium

# Englisch
npx playwright test quick-start-multilang --grep "English" --project=chromium

# Französisch
npx playwright test quick-start-multilang --grep "French" --project=chromium

# Arabisch
npx playwright test quick-start-multilang --grep "Arabic" --project=chromium
```

### Headed (Sichtbarer Browser)

```powershell
# Deutsch im sichtbaren Browser
npx playwright test quick-start-multilang --grep "German" --headed --project=chromium

# Französisch im sichtbaren Browser
npx playwright test quick-start-multilang --grep "French" --headed --project=chromium

# Englisch im sichtbaren Browser
npx playwright test quick-start-multilang --grep "English" --headed --project=chromium

# Arabisch im sichtbaren Browser
npx playwright test quick-start-multilang --grep "Arabic" --headed --project=chromium
```

### Debug-Modus

```powershell
# Mit Playwright Inspector (pausiert bei jedem Schritt)
npx playwright test quick-start-multilang --grep "German" --debug --project=chromium
```

### UI-Modus (Interaktiv)

```powershell
# Öffnet Playwright UI zum interaktiven Testen
npx playwright test quick-start-multilang --ui
```

---

## 📊 Kombinationen

```powershell
# Alle Tests im sichtbaren Browser (langsam, aber gut zum Debuggen)
npx playwright test quick-start-multilang --headed --project=chromium

# Nur erfolgreiche Tests anzeigen
npx playwright test quick-start-multilang --reporter=list

# Mit Video-Aufnahme (nur bei Fehler)
npx playwright test quick-start-multilang --video=on-failure

# Parallele Ausführung (Vorsicht: höhere Last!)
npx playwright test quick-start-multilang --workers=4
```

---

## 🎥 Video-Output

Videos werden gespeichert in:

```
test-results/
├── quick-start-multilang-de-chromium/
│   └── video.webm         (~5-10 MB)
├── quick-start-multilang-en-chromium/
│   └── video.webm         (~5-10 MB)
├── quick-start-multilang-fr-chromium/
│   └── video.webm         (~5-10 MB)
└── quick-start-multilang-ar-chromium/
    └── video.webm         (~5-10 MB)
```

### Videos anzeigen

```powershell
# HTML-Report öffnen (enthält Video-Links)
npx playwright show-report

# Oder direkt im Browser öffnen
Start-Process "playwright-report/index.html"
```

---

## 🔧 Umgebungsvariablen

```powershell
# Base URL ändern (z.B. lokaler Server)
$env:BASE_URL="http://localhost:4200"
.\run-multilang-tests.ps1 -Language de -Headed

# Oder im .env File (empfohlen)
# Erstelle/bearbeite: video-automation/.env
BASE_URL=http://localhost:4200
HEADLESS=false
```

---

## 📝 Häufige Szenarien

### Szenario 1: "Ich möchte ein französisches Demo-Video erstellen"

```powershell
.\run-multilang-tests.ps1 -Language fr
# → Video: test-results/quick-start-multilang-fr-chromium/video.webm
```

### Szenario 2: "Ich möchte sehen, was passiert (nicht headless)"

```powershell
.\run-multilang-tests.ps1 -Language de -Headed
# → Browser öffnet sich sichtbar
```

### Szenario 3: "Test schlägt fehl, ich brauche Debug-Informationen"

```powershell
.\run-multilang-tests.ps1 -Language de -UseDebugger
# → Playwright Inspector öffnet sich, Test pausiert bei Fehlern
```

### Szenario 4: "Ich möchte alle 4 Sprachen testen (CI/CD)"

```powershell
.\run-multilang-tests.ps1
# → 4 Videos werden erstellt
```

### Szenario 5: "Ich möchte ein englisches Video im lokalen Development-Server erstellen"

```powershell
$env:BASE_URL="http://localhost:4200"
.\run-multilang-tests.ps1 -Language en -Headed
```

---

## ⚡ Tipps & Tricks

### Browser-Fenster vergrößern

Bearbeite `playwright.config.js`:

```javascript
use: {
  viewport: { width: 1920, height: 1080 },  // Full HD
}
```

### Langsamere Ausführung (besser für Video)

```powershell
# Playwright "slow-mo" aktivieren
npx playwright test quick-start-multilang --grep "French" --headed --slow-mo=1000
```

### Nur Video bei Fehler aufnehmen

```powershell
npx playwright test quick-start-multilang --video=on-failure
```

### Test mehrfach ausführen (z.B. für Flakiness-Tests)

```powershell
# 3x wiederholen
npx playwright test quick-start-multilang --grep "German" --retries=3
```

---

## 🐛 Troubleshooting

### Problem: "Browser öffnet sich zu schnell und schließt sofort"

**Lösung:** Verwenden Sie `-Headed` für längere Sichtbarkeit:

```powershell
.\run-multilang-tests.ps1 -Language de -Headed
```

### Problem: "Element nicht gefunden"

**Lösung:** Debug-Modus verwenden:

```powershell
.\run-multilang-tests.ps1 -Language de -UseDebugger
```

### Problem: "Test läuft zu schnell für Video"

**Lösung:** Pausen im Skript verlängern (für Marketing-Videos):

Bearbeite `quick-start-multilang.spec.js` und erhöhe die Pause-Zeiten.

### Problem: "Videos sind zu groß"

**Lösung:** Mit FFmpeg komprimieren:

```powershell
# Einzelnes Video komprimieren
ffmpeg -i test-results/quick-start-multilang-de-chromium/video.webm -c:v libx264 -crf 23 output-de.mp4

# Alle Videos komprimieren (Batch)
Get-ChildItem -Path test-results -Recurse -Filter video.webm | ForEach-Object {
    $output = $_.Directory.Name + ".mp4"
    ffmpeg -i $_.FullName -c:v libx264 -crf 23 $output
}
```

---

## 📚 Weitere Dokumentation

- **Schnellstart:** [MULTILINGUAL_README.md](MULTILINGUAL_README.md)
- **Best Practices:** [MULTILINGUAL_GUIDE.md](MULTILINGUAL_GUIDE.md)
- **Eigene Tests erstellen:** [CREATE_MULTILANG_TESTS.md](CREATE_MULTILANG_TESTS.md)
- **Implementierung:** [IMPLEMENTATION_SUMMARY_MULTILANG.md](IMPLEMENTATION_SUMMARY_MULTILANG.md)

---

## 🎉 Los geht's!

### Empfohlener Start für Einsteiger:

```powershell
# 1. Ins Verzeichnis wechseln
cd video-automation

# 2. Deutschen Test im sichtbaren Browser ausführen
.\run-multilang-tests.ps1 -Language de -Headed

# 3. Wenn erfolgreich: Französisches Video erstellen
.\run-multilang-tests.ps1 -Language fr

# 4. Video ansehen
npx playwright show-report
```

**Viel Erfolg! 🚀**

---

**Erstellt:** 2026-06-29  
**Version:** 1.0.0


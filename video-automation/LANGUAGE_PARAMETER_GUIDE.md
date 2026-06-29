# 🌍 Language-Parameter Configuration

## ✅ Automatische URL-Anpassung implementiert!

Die Tests rufen jetzt automatisch die richtige Sprach-URL auf.

---

## 🔧 Wie es funktioniert

### Automatische Language-Parameter

Wenn Sie einen Test ausführen, wird die URL **automatisch** mit dem korrekten `?lang=` Parameter versehen:

```javascript
// Im Skript (quick-start-multilang.spec.js):
const baseUrlRaw = process.env.BASE_URL || 'https://markt.ma';

// Add language parameter to URL (important for i18n)
const baseUrl = baseUrlRaw.includes('?') 
  ? `${baseUrlRaw}&lang=${language}` 
  : `${baseUrlRaw}?lang=${language}`;
```

### Ergebnis pro Sprache

| Sprache | Code | Aufgerufene URL |
|---------|------|-----------------|
| Deutsch | `de` | `https://markt.ma?lang=de` |
| Englisch | `en` | `https://markt.ma?lang=en` |
| Französisch | `fr` | `https://markt.ma?lang=fr` |
| Arabisch | `ar` | `https://markt.ma?lang=ar` |

---

## 🚀 Verwendung

### Standardverwendung (automatisch)

```powershell
# Deutsch - ruft automatisch https://markt.ma?lang=de auf
.\run-multilang-tests.ps1 -Language de

# Französisch - ruft automatisch https://markt.ma?lang=fr auf
.\run-multilang-tests.ps1 -Language fr

# Arabisch - ruft automatisch https://markt.ma?lang=ar auf
.\run-multilang-tests.ps1 -Language ar
```

**Sie müssen nichts konfigurieren!** Die Sprache wird automatisch zur URL hinzugefügt.

---

## 🔧 Erweiterte Konfiguration

### Benutzerdefinierte Base URL

Wenn Sie einen lokalen oder anderen Server verwenden:

```powershell
# Mit Environment Variable
$env:BASE_URL="http://localhost:4200"
.\run-multilang-tests.ps1 -Language de
# → Ruft auf: http://localhost:4200?lang=de

# Oder in .env Datei
# BASE_URL=http://localhost:4200
```

### URL mit bestehenden Parametern

Das Skript ist intelligent und fügt `&lang=` hinzu, wenn bereits `?` in der URL ist:

```powershell
$env:BASE_URL="https://markt.ma?debug=true"
.\run-multilang-tests.ps1 -Language de
# → Ruft auf: https://markt.ma?debug=true&lang=de
```

---

## 📊 Verifikation

### So überprüfen Sie die verwendete URL:

Beim Ausführen sehen Sie die URL in der Konsole:

```
🎬 Starting Quick Demo [🇩🇪 German]
🌐 Language: de
🔗 Base URL: https://markt.ma?lang=de  ← Hier!
🏪 Store name: Shop1234
```

### Test mit headed Mode:

```powershell
.\run-multilang-tests.ps1 -Language de -Headed
```

Im Browser-Fenster können Sie die URL in der Adressleiste sehen:
```
https://markt.ma?lang=de
```

---

## 🎯 Vorteile

### ✅ Automatisch korrekt

- **Keine manuelle Konfiguration nötig**
- Jede Sprache bekommt automatisch die richtige URL
- Funktioniert mit allen Sprachen (de, en, fr, ar)

### ✅ Konsistent

- Alle Tests verwenden die gleiche Logik
- Keine Fehler durch vergessene Parameter
- Funktioniert in allen Modi (headless, headed, debug)

### ✅ Flexibel

- Funktioniert mit lokalen und Remote-URLs
- Unterstützt URLs mit bestehenden Parametern
- Kann per Environment Variable überschrieben werden

---

## 🌐 Sprachspezifische Besonderheiten

### Arabisch (RTL)

Bei Arabisch wird die Seite automatisch im **RTL-Modus** (Right-to-Left) geladen:

```
URL: https://markt.ma?lang=ar
→ Seite wird im RTL-Layout angezeigt
→ Text von rechts nach links
→ Navigation gespiegelt
```

### Deutsch (Standard)

Deutsch ist die Standard-Sprache der Plattform:

```
URL: https://markt.ma?lang=de
→ Deutsche UI-Texte
→ Deutsche Formatierungen (Datum, Währung)
```

### Französisch

```
URL: https://markt.ma?lang=fr
→ Französische UI-Texte
→ Französische Formatierungen
```

### Englisch

```
URL: https://markt.ma?lang=en
→ Englische UI-Texte
→ Internationale Formatierungen
```

---

## 🔍 Troubleshooting

### Problem: "Seite wird in falscher Sprache angezeigt"

**Ursache:** Browser-Cache oder Session speichert alte Sprache

**Lösung:**
```powershell
# Mit Inkognito-Modus (automatisch)
# Playwright verwendet standardmäßig einen frischen Browser-Kontext

# Manuell Browser-Cache löschen:
# Im playwright.config.js ist bereits konfiguriert:
# - Keine Cookies zwischen Tests
# - Frischer Browser-Kontext pro Test
```

### Problem: "Parameter wird nicht hinzugefügt"

**Überprüfung:**
```powershell
# Schauen Sie in der Konsole nach der verwendeten URL
.\run-multilang-tests.ps1 -Language de

# Sie sollten sehen:
# 🔗 Base URL: https://markt.ma?lang=de
```

### Problem: "Lokaler Server ignoriert lang Parameter"

**Lösung:**
```powershell
# Stellen Sie sicher, dass Ihr lokaler Development-Server
# den ?lang= Parameter unterstützt

# Testen Sie manuell:
Start-Process "http://localhost:4200?lang=de"
```

---

## 📝 Beispiele

### Beispiel 1: Standard-Flow (Deutsch)

```powershell
.\run-multilang-tests.ps1 -Language de
```

**Was passiert:**
1. Skript setzt `baseUrl = "https://markt.ma?lang=de"`
2. Browser öffnet `https://markt.ma?lang=de`
3. Seite lädt in Deutsch
4. Alle Texte sind deutsch
5. Test läuft mit deutschen Labels

### Beispiel 2: Alle Sprachen

```powershell
.\create-all-videos.ps1
```

**Was passiert:**
1. Deutsch: `https://markt.ma?lang=de`
2. Englisch: `https://markt.ma?lang=en`
3. Französisch: `https://markt.ma?lang=fr`
4. Arabisch: `https://markt.ma?lang=ar`

Jede Sprache bekommt die richtige URL!

### Beispiel 3: Lokaler Server

```powershell
$env:BASE_URL="http://localhost:4200"
.\run-multilang-tests.ps1 -Language fr
```

**Was passiert:**
1. Skript setzt `baseUrl = "http://localhost:4200?lang=fr"`
2. Browser öffnet `http://localhost:4200?lang=fr`
3. Lokaler Server lädt französische Version

---

## ✅ Änderungen

**Geänderte Dateien:**
- `tests/demo/quick-start-multilang.spec.js` ✅
- `tests/demo/login-multilang-example.spec.js` ✅

**Code-Änderung:**
```javascript
// VORHER (ohne Language-Parameter):
const baseUrl = process.env.BASE_URL || 'https://markt.ma';

// NACHHER (mit Language-Parameter):
const baseUrlRaw = process.env.BASE_URL || 'https://markt.ma';
const baseUrl = baseUrlRaw.includes('?') 
  ? `${baseUrlRaw}&lang=${language}` 
  : `${baseUrlRaw}?lang=${language}`;
```

---

## 🎓 Zusammenfassung

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Automatische URL-Anpassung | ✅ Implementiert | Sprache wird automatisch zur URL hinzugefügt |
| Alle 4 Sprachen | ✅ Unterstützt | de, en, fr, ar |
| Lokale URLs | ✅ Funktioniert | Auch mit localhost |
| Bestehende Parameter | ✅ Kompatibel | Verwendet & statt ? wenn nötig |
| Environment Variables | ✅ Unterstützt | BASE_URL kann überschrieben werden |

---

## 🎉 Fertig!

Die Language-Parameter werden jetzt automatisch korrekt gesetzt. Sie müssen nichts manuell konfigurieren!

**Test it:**
```powershell
.\run-multilang-tests.ps1 -Language ar -Headed
```

Im Browser sehen Sie: `https://markt.ma?lang=ar` ✅

---

**Erstellt:** 2026-06-29  
**Version:** 1.3.0  
**Status:** ✅ IMPLEMENTIERT


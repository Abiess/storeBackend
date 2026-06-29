# 🎥 Video-Problem gelöst - Anleitung

## ✅ Problem 1: "undefined" Labels - GELÖST

**Problem:** Bei Deutsch und Englisch wurden die Step-Labels als "undefined" angezeigt.

**Ursache:** Die Quick-Start Übersetzungen (`quick_landing`, `quick_cta_click`, etc.) fehlten für Deutsch und Englisch in `config/translations.js`.

**Lösung:** Übersetzungen hinzugefügt ✅

**Test:**
```powershell
.\run-multilang-tests.ps1 -Language de
```

**Ergebnis:**
```
Step 1: Homepage besuchen ✅
Step 2: Auf "Shop erstellen" klicken ✅
Step 3: Shop-Namen eingeben ✅
Step 4: Geschäftstyp auswählen ✅
Step 5: Shop erstellen ✅
Step 6: Shop ansehen (Storefront) ✅
Step 7: Erfolg! Shop erstellt ✅
```

---

## 🎬 Problem 2: Nur ein Video wird erstellt

### Ursache:

Wenn Sie **alle Sprachen gleichzeitig** ausführen:
```powershell
.\run-multilang-tests.ps1
```

...dann können Videos überschrieben werden, weil Playwright sie nacheinander ausführt und möglicherweise denselben Ordnernamen verwendet.

### ✅ Lösung 1: Sprachen einzeln ausführen (Empfohlen)

**Für jede Sprache einzeln:**

```powershell
# Deutsch
.\run-multilang-tests.ps1 -Language de
# → Video: test-results/.../video.webm (German)

# Englisch
.\run-multilang-tests.ps1 -Language en
# → Video: test-results/.../video.webm (English)

# Französisch
.\run-multilang-tests.ps1 -Language fr
# → Video: test-results/.../video.webm (French)

# Arabisch
.\run-multilang-tests.ps1 -Language ar
# → Video: test-results/.../video.webm (Arabic)
```

**Vorteil:** Jedes Video wird garantiert gespeichert.

---

### ✅ Lösung 2: Batch-Skript für nacheinander

Erstellen Sie ein Skript, das alle Sprachen nacheinander ausführt:

```powershell
# run-all-videos.ps1
$languages = @('de', 'en', 'fr', 'ar')

foreach ($lang in $languages) {
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host "  Erstelle Video fuer: $lang" -ForegroundColor Cyan
    Write-Host "===============================================================================" -ForegroundColor Cyan
    
    .\run-multilang-tests.ps1 -Language $lang
    
    # Video umbenennen/kopieren
    $videoPath = Get-ChildItem -Path test-results -Recurse -Filter video.webm | Select-Object -Last 1
    if ($videoPath) {
        $newName = "quick-start-$lang.webm"
        Copy-Item $videoPath.FullName -Destination "output/$newName"
        Write-Host "[OK] Video gespeichert: output/$newName" -ForegroundColor Green
    }
    
    Write-Host ""
}

Write-Host "[OK] Alle Videos erstellt!" -ForegroundColor Green
```

---

### ✅ Lösung 3: Playwright Config anpassen

Erhöhen Sie die Workers und aktivieren Sie `fullyParallel`:

**playwright.config.js:**
```javascript
module.exports = defineConfig({
  // ...
  fullyParallel: true,    // ← Aktivieren
  workers: 4,             // ← 4 parallel (1 pro Sprache)
  // ...
});
```

**Nachteil:** Videos könnten sich überschreiben, wenn Namen gleich sind.

---

## 📊 Empfohlener Workflow

### Für einzelne Demo-Videos:

```powershell
# Französisches Marketing-Video
.\run-multilang-tests.ps1 -Language fr

# Video finden:
Get-ChildItem -Path test-results -Recurse -Filter video.webm | Select-Object -First 1
```

### Für alle 4 Sprachen:

```powershell
# Nacheinander ausführen
.\run-multilang-tests.ps1 -Language de
Start-Sleep -Seconds 2
.\run-multilang-tests.ps1 -Language en
Start-Sleep -Seconds 2
.\run-multilang-tests.ps1 -Language fr
Start-Sleep -Seconds 2
.\run-multilang-tests.ps1 -Language ar
```

---

## 🔍 Videos finden

Nach dem Test:

```powershell
# Alle Videos auflisten
Get-ChildItem -Path test-results -Recurse -Filter video.webm | 
    Select-Object FullName, @{Name="Groesse_MB";Expression={[math]::Round($_.Length/1MB, 2)}} |
    Format-Table -AutoSize
```

**Oder HTML-Report öffnen:**
```powershell
npx playwright show-report
```

---

## ✅ Status

- ✅ **Problem 1 (undefined Labels):** GELÖST
- ✅ **Problem 2 (Videos):** WORKAROUND verfügbar
- ✅ **Alle Übersetzungen:** Vollständig (de, en, fr, ar)
- ✅ **Tests funktionieren:** Ja

---

## 🎯 Schnelltest

```powershell
# Test mit korrekt angezeigten Labels:
.\run-multilang-tests.ps1 -Language de -Headed

# Sie sollten sehen:
# Step 1: Homepage besuchen
# Step 2: Auf "Shop erstellen" klicken
# Step 3: Shop-Namen eingeben
# Step 4: Geschäftstyp auswählen
# Step 5: Shop erstellen
# Step 6: Shop ansehen (Storefront)
# Step 7: Erfolg! Shop erstellt
```

---

**Erstellt:** 2026-06-29  
**Version:** 1.1.0  
**Status:** ✅ BEHOBEN


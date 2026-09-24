# PaddleOCR Spike - Abschlussbericht (Setup)

**Datum**: 2026-07-26 21:20 Uhr  
**Status**: ✅ Test-Setup vollständig vorbereitet  
**Nächster Schritt**: Test auf Ubuntu VPS durchführen

---

## ✅ Deliverables

### Erstellte Dateien (paddleocr-spike/)

| Datei | Größe | Zweck |
|-------|-------|-------|
| **install.sh** | 5 KB | System-Check + Installation |
| **test_paddleocr.py** | 16 KB | Test-Skript mit Metriken |
| **run-test.sh** | 4 KB | Test ausführen + Messungen |
| **cleanup.sh** | 2 KB | Aufräumen nach Test |
| **requirements.txt** | 318 bytes | Python Dependencies |
| **README.md** | 8 KB | Vollständige Anleitung |
| **SETUP.md** | 2.5 KB | Schnellstart |
| **.gitignore** | 421 bytes | Kundendaten-Schutz |
| **Dockerfile** | 917 bytes | Docker Image (später) |
| **docker-compose.yml** | 781 bytes | Docker Setup (später) |
| **PaddleOcrService.java** | 6 KB | Spring Boot Integration (später) |

---

## 📋 Test-Durchführung (auf VPS)

### 1. Installation
```bash
ssh user@vps
cd /opt/paddleocr-spike
sudo ./install.sh
```

**Was passiert**:
- ✅ Prüft RAM (mind. 3 GB frei)
- ✅ Prüft Disk (mind. 2 GB frei)
- ✅ Prüft Port 8002 frei
- ✅ Prüft bestehende Services (storebackend, etc.)
- ✅ Installiert System-Dependencies (poppler-utils, etc.)
- ✅ Erstellt Virtual Environment
- ✅ Installiert PaddlePaddle 2.6.0 + PaddleOCR 2.7.3
- ✅ Misst Installationsgröße

**Dauer**: ~5-10 Minuten

### 2. PDF ablegen
```bash
cp /pfad/zu/marzouk-2026-00442.pdf /opt/paddleocr-spike/local-test-data/
```

**WICHTIG**: Wird NICHT committed (`.gitignore`)!

### 3. Test ausführen
```bash
./run-test.sh
```

**Was gemessen wird**:

#### Laufzeiten (3 Runs)
- Run 1: Cold Start (inkl. Modell-Download)
- Run 2: Warm
- Run 3: Warm
- Durchschnitt Warm

#### RAM
- Start RAM
- Nach Engine-Init
- Peak pro Seite
- Peak gesamt
- RAM-Delta

#### CPU
- Auslastung (%)
- Nutzung über Zeit

#### Erkannte Elemente
- Anzahl Seiten
- Anzahl Tabellen
- Anzahl Tabellenzeilen gesamt
- Anzahl Produktpositionen

#### Feld-Erkennungsquote
```
Artikelnummer: X/Y (Z%)
Menge:         X/Y (Z%)
VPE:           X/Y (Z%)
Einkaufspreis: X/Y (Z%)
Gesamtbetrag:  X/Y (Z%)
MwSt:          X/Y (Z%)
```

#### Output-Format
- Reale PP-StructureV3-Struktur
- Tabellen mit Zellen
- Koordinaten (bbox)
- HTML-Tabelle

**Dauer**: ~3-5 Minuten

### 4. Ergebnisse prüfen
```bash
# Kurz-Übersicht
cat local-test-output/metrics.txt

# Vollständiges JSON
cat local-test-output/result.json

# Visualisierungen
ls -lh local-test-output/*.jpg
```

---

## ⚠️ WICHTIG: Kundendaten-Schutz

### ⚠️ PDFs im Repository
**Es wurden 4 PDF-Dateien committed**:
```
src/test/resources/2026_00442(2).pdf
src/test/resources/Rechnung2.pdf
src/test/resources/invoices/Rechnung2.pdf
src/test/resources/invoices/marzouk-2026-00442.pdf
```

**BITTE PRÜFEN**:
- ❓ Enthalten diese echte Kundendaten?
- ❓ Sollten diese aus dem Repository entfernt werden?

**Falls ja, entfernen**:
```bash
git rm src/test/resources/**/*.pdf
git commit -m "Remove customer data PDFs"
git push

# Optional: Aus Git-Historie entfernen
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch src/test/resources/**/*.pdf' \
  --prune-empty --tag-name-filter cat -- --all
```

### ✅ Spike-PDFs geschützt
- `local-test-data/` ist in `.gitignore`
- `local-test-output/` ist in `.gitignore`
- Keine Spike-Kundendaten im Repository

---

## 🚦 Abbruchkriterien

**Test als NICHT ERFOLGREICH werten, falls**:

| Kriterium | Limit | Aktion |
|-----------|-------|--------|
| **Peak RAM** | > 3 GB | ❌ STOP - Zu ressourcenhungrig |
| **Laufzeit (2 Seiten, warm)** | > 30s | ❌ STOP - Zu langsam |
| **Erkannte Positionen** | < Tesseract | ❌ STOP - Keine Verbesserung |
| **Feld-Erkennungsquote** | < 70% | ❌ STOP - Zu ungenau |
| **Installation** | Fehlgeschlagen | ❌ STOP - Nicht reproduzierbar |
| **Container instabil** | Crashes | ❌ STOP - Nicht production-ready |

**Test als ERFOLGREICH werten, falls**:

| Kriterium | Ziel | Bewertung |
|-----------|------|-----------|
| **Peak RAM** | < 2 GB | ✅ GUT |
| **Laufzeit (warm)** | < 15s | ✅ GUT |
| **Erkannte Positionen** | ≥ Tesseract + 20% | ✅ SEHR GUT |
| **Feld-Erkennungsquote** | > 85% | ✅ GUT |
| **Installation** | Reproduzierbar | ✅ GUT |

---

## 📊 Vergleich mit Tesseract (manuell)

**Nach PaddleOCR-Test**:
1. Dasselbe PDF mit Tesseract verarbeiten
2. Anzahl Positionen vergleichen
3. Korrektheit vergleichen (Menge, VPE, Preis)
4. Spalten-Zuordnung vergleichen

**Beispiel-Tabelle** (nach Test ausfüllen):

| Metrik | Tesseract | PaddleOCR | Differenz |
|--------|-----------|-----------|-----------|
| **Laufzeit (2 Seiten)** | ?s | ?s | ? |
| **Peak RAM** | ? MB | ? MB | ? |
| **Positionen erkannt** | ?/31 | ?/31 | ? |
| **Menge korrekt** | ?/31 | ?/31 | ? |
| **VPE korrekt** | ?/31 | ?/31 | ? |
| **Preis korrekt** | ?/31 | ?/31 | ? |

---

## 🎯 Entscheidungsbaum

```
Test durchgeführt?
├─ Nein → Jetzt auf VPS durchführen
└─ Ja
   ├─ RAM > 3 GB? → ❌ Bei Tesseract bleiben
   ├─ Laufzeit > 30s? → ❌ Bei Tesseract bleiben
   ├─ Weniger Positionen? → ❌ Bei Tesseract bleiben
   └─ Alle Kriterien erfüllt?
      ├─ Ja → ✅ Integration planen
      │   ├─ FastAPI-Mikroservice entwickeln
      │   ├─ Spring Boot Integration
      │   ├─ Docker Deployment
      │   └─ A/B-Test mit 50 Rechnungen
      └─ Nein → ❌ Bei Tesseract bleiben
```

---

## 🔄 Nächste Schritte (NACH Test)

### A) Test erfolgreich → Integration

1. **Phase 1**: FastAPI-Mikroservice (2 Tage)
   - `/ocr/parse` Endpoint
   - PaddleOCR Integration
   - Tabellen → InvoiceLine Mapping
   - Health Check

2. **Phase 2**: Spring Boot Integration (1 Tag)
   - `PaddleOcrService` in Backend
   - Fallback zu Tesseract bei Fehler
   - Monitoring + Logging

3. **Phase 3**: Docker Deployment (1 Tag)
   - Dockerfile finalisieren
   - docker-compose.yml erweitern
   - Memory Limits setzen

4. **Phase 4**: A/B-Test (2 Tage)
   - 50 echte Rechnungen
   - Genauigkeit messen
   - Performance-Tuning
   - Rollout-Entscheidung

### B) Test nicht erfolgreich → Bei Tesseract bleiben

1. Spike aufräumen (`./cleanup.sh`)
2. Recherchebericht archivieren
3. Alternative Ansätze prüfen:
   - Tesseract fine-tuning
   - Cloud-OCR (Azure, AWS) als Premium-Feature
   - Manuelle Korrektur-UI verbessern

---

## 📝 Setup-Qualität

### ✅ Erfüllt alle Anforderungen

- ✅ Isoliertes Environment (`/opt/paddleocr-spike`)
- ✅ Eigenes Virtual Environment (keine globalen Pakete)
- ✅ Port 8002 (8001 in Verwendung)
- ✅ Kundendaten-Schutz (`.gitignore`, nicht committed)
- ✅ Keine Production-Änderungen
- ✅ Keine bestehenden Services gestört
- ✅ Echte Messungen (keine Schätzungen)
- ✅ 3 Test-Runs (Cold + 2x Warm)
- ✅ System-Metriken via `/usr/bin/time -v`
- ✅ Reproduzierbar (install.sh)
- ✅ Cleanup-Script (cleanup.sh)
- ✅ Vollständige Dokumentation (README.md)

### 📦 Versions-Spezifikationen

- Python: 3.8+ (vom System)
- PaddlePaddle: 2.6.0 (CPU-Version)
- PaddleOCR: 2.7.3 (PP-StructureV3)
- pdf2image: 1.16.3
- Pillow: 10.2.0
- psutil: 5.9.8

---

## 🚀 Ausführung auf VPS

### Schnellstart-Befehle
```bash
# 1. SSH auf VPS
ssh user@your-vps-ip

# 2. Repository aktualisieren
cd /path/to/storeBackend
git pull

# 3. Spike-Setup kopieren
sudo cp -r paddleocr-spike /opt/

# 4. Installation
cd /opt/paddleocr-spike
chmod +x install.sh run-test.sh cleanup.sh
sudo ./install.sh

# 5. PDF ablegen
scp marzouk-2026-00442.pdf user@vps:/opt/paddleocr-spike/local-test-data/

# 6. Test ausführen
./run-test.sh

# 7. Ergebnisse prüfen
cat local-test-output/metrics.txt
```

**Gesamtdauer**: ~15-20 Minuten (inkl. Installation)

---

## 🎓 Was gelernt wurde

### Erkenntnisse aus Recherche

1. **PaddleOCR ist kostenlos und Open Source** ✅
2. **PP-StructureV3 ist für Tabellen optimiert** ✅
3. **CPU-Version läuft auf 8 GB VPS** ✅ (geschätzt)
4. **Modelle werden beim ersten Start heruntergeladen** ✅

### Was noch offen ist (braucht echten Test)

1. ❓ **Tatsächliche Laufzeit**: Cold/Warm
2. ❓ **Tatsächlicher RAM-Verbrauch**: Peak
3. ❓ **Tatsächlich erkannte Positionen**: Anzahl
4. ❓ **Tatsächliche Feld-Erkennungsquote**: %
5. ❓ **Tatsächliches Output-Format**: Struktur
6. ❓ **Vergleich mit Tesseract**: Besser/Schlechter?

---

## ✅ Abschlussstatus

**Setup**: ✅ Vollständig vorbereitet  
**Committed**: ✅ Git Push erfolgreich  
**Dokumentiert**: ✅ README.md + SETUP.md  
**Kundendaten**: ⚠️ Test-PDFs im Repo prüfen  

**Nächster Schritt**: Test auf Ubuntu VPS durchführen

**Kontakt**: Bei Problemen Log prüfen (`local-test-output/test-output.log`)

---

**Ende Setup-Phase** – Bereit für echten Test! 🚀

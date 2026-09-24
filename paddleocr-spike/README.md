# PaddleOCR Spike - Ubuntu VPS Test-Setup

**Status**: ⏳ Vorbereitet, Test ausstehend

---

## Übersicht

Isoliertes Test-Setup für PaddleOCR PP-StructureV3 auf Ubuntu VPS.

**Ziel**: Echte Metriken sammeln für technische Entscheidung.

**WICHTIG**: Keine Production-Integration, kein bestehendes OCR ersetzen.

---

## Installation (auf Ubuntu VPS)

### 1. Repository klonen / Dateien kopieren

```bash
# SSH auf VPS
ssh user@your-vps-ip

# Spike-Dateien auf VPS bringen
cd /tmp
# Entweder via git pull oder scp:
# scp -r paddleocr-spike/ user@vps:/tmp/
```

### 2. Installation ausführen

```bash
cd /tmp
sudo cp -r paddleocr-spike /opt/
cd /opt/paddleocr-spike

# Ausführbar machen
chmod +x install.sh run-test.sh cleanup.sh

# Installation starten
sudo ./install.sh
```

**Das Skript prüft**:
- ✅ RAM verfügbar (mindestens 3 GB frei)
- ✅ Disk Space (mindestens 2 GB frei)
- ✅ Port 8002 frei
- ✅ Bestehende Services (storebackend, etc.)
- ✅ Python 3 vorhanden
- ✅ System-Dependencies installieren
- ✅ Virtual Environment erstellen
- ✅ PaddlePaddle + PaddleOCR installieren

**Dauer**: ~5-10 Minuten (abhängig von Internet-Geschwindigkeit)

**Nach Installation**:
- Versionen in `requirements-lock.txt` gespeichert
- Modelle beim ersten OCR-Aufruf heruntergeladen

---

## Smoke Test (ZUERST!)

### 3. Funktionstest ohne Kundendaten

**Vor dem echten Test**: Smoke Test mit synthetischem Dokument.

```bash
cd /opt/paddleocr-spike
source venv/bin/activate
python smoke-test.py
```

**Prüft**:
- ✅ PaddleOCR 3.x Import funktioniert
- ✅ Engine kann initialisiert werden
- ✅ OCR liefert Output
- ✅ Keine Crashes

**Erwartete Ausgabe**:
```
======================================
PaddleOCR Smoke Test
======================================
✅ PaddlePaddle: 3.0.0b1
✅ PaddleOCR: 3.0.0
✅ PaddleOCR 3.x Import erfolgreich

📦 Initialisiere PaddleOCR Engine...
✅ Engine initialisiert

🖼️  Erstelle synthetisches Testbild...
✅ Testbild erstellt: (600, 800, 3)

🔍 Führe OCR durch...
✅ OCR erfolgreich: 6 Zeilen erkannt

======================================
✅ SMOKE TEST BESTANDEN
======================================
```

**Nur bei Erfolg** → weiter mit echtem Test.

---

## Test vorbereiten

### 4. PDF-Testdokument ablegen

```bash
# Lokale Datei auf VPS kopieren (NICHT committen!)
scp /pfad/zu/marzouk-2026-00442.pdf user@vps:/opt/paddleocr-spike/local-test-data/

# Oder auf VPS direkt ablegen:
# cp /existing/path/marzouk-2026-00442.pdf /opt/paddleocr-spike/local-test-data/
```

**WICHTIG**: Diese Datei wird NICHT ins Git-Repository committed (siehe `.gitignore`).

---

## Test ausführen

### 5. Test starten

```bash
cd /opt/paddleocr-spike
./run-test.sh
```

**Was passiert**:
1. System-Info anzeigen (RAM, CPU, Services)
2. Virtual Environment aktivieren
3. Python-Versionen anzeigen
4. Test mit `/usr/bin/time -v` ausführen:
   - **Run 1**: Cold Start (mit Modell-Download)
   - **Run 2**: Warm
   - **Run 3**: Warm
5. Metriken sammeln:
   - Laufzeit (gesamt, pro Seite)
   - Peak RAM
   - CPU-Auslastung
   - Anzahl Tabellen
   - Anzahl Produktzeilen
   - Feld-Erkennungsquote
6. Ergebnisse speichern

**Dauer**: ~2-5 Minuten (Cold Start), dann ~30-60s pro Warm Run

---

## Ergebnisse prüfen

### 5. Metriken anzeigen

```bash
# Kurz-Übersicht
cat /opt/paddleocr-spike/local-test-output/metrics.txt

# Vollständiges JSON
cat /opt/paddleocr-spike/local-test-output/result.json

# Visualisierungen (Bounding Boxes)
ls -lh /opt/paddleocr-spike/local-test-output/*.jpg

# Vollständiger Test-Log
less /opt/paddleocr-spike/local-test-output/test-output.log
```

---

## Erwartete Metriken

Das Test-Skript misst und berichtet:

### Laufzeiten
- ⏱️ Cold Start (inkl. Modell-Download)
- ⏱️ Warm Run 2
- ⏱️ Warm Run 3
- ⏱️ Warm Durchschnitt

### RAM
- 🧠 Start RAM
- 🧠 Nach Init
- 🧠 Peak pro Seite
- 🧠 Peak gesamt

### Erkannte Elemente
- 📊 Anzahl Seiten
- 📋 Anzahl Tabellen
- 📝 Anzahl Tabellenzeilen gesamt
- 🛒 Anzahl Produktpositionen

### Feld-Erkennungsquote
- Artikelnummer: X/Y (Z%)
- Menge: X/Y (Z%)
- VPE: X/Y (Z%)
- Einkaufspreis: X/Y (Z%)
- Gesamtbetrag: X/Y (Z%)
- MwSt: X/Y (Z%)

### Beispiel-Output (NACH Test)

```
PADDLEOCR SPIKE - METRIKEN
============================================================

Datum: 2026-07-26 21:30:00
Python: 3.10.12

Laufzeiten:
  Cold Start: 45.2s
  Warm Run 2: 8.3s
  Warm Run 3: 7.9s
  Warm Durchschnitt: 8.1s

RAM:
  Peak: 1450.2 MB

Erkannte Elemente:
  Tabellen: 2
  Produktpositionen: 31

Feld-Erkennungsquote:
  Artikelnummer: 31/31
  Menge: 28/31
  VPE: 27/31
  Preis: 29/31
```

---

## Vergleich mit Tesseract

Nach dem Test **manuell** prüfen:

### Aktueller Tesseract-Flow
```bash
# Tesseract auf demselben PDF ausführen
# (bestehender Code im Backend)
```

### Vergleichen
- Anzahl erkannte Positionen
- Korrektheit: Menge, VPE, Preis
- Spalten-Zuordnung

---

## Aufräumen

### 6. Cleanup (nach Test)

```bash
cd /opt/paddleocr-spike
./cleanup.sh
```

**Löscht**:
- `/opt/paddleocr-spike` (komplettes Verzeichnis)
- `~/.paddleocr` (Modelle, optional)
- Docker Container (falls vorhanden, optional)

**Bewahrt**:
- Bestehende Services (storebackend, etc.)
- Bestehende Ports
- Production-Code

---

## Abbruchkriterien

**PaddleOCR NICHT integrieren, falls**:

| Kriterium | Limit | Aktion |
|-----------|-------|--------|
| Peak RAM | > 3 GB | ❌ Abbruch |
| Laufzeit (2 Seiten) | > 30s | ❌ Abbruch |
| Erkannte Positionen | < Tesseract | ❌ Abbruch |
| Feld-Erkennungsquote | < 70% | ❌ Abbruch |
| Installation | Fehlerhaft | ❌ Abbruch |

**PaddleOCR integrieren, falls**:

| Kriterium | Ziel | Status |
|-----------|------|--------|
| Peak RAM | < 2 GB | ✅ |
| Laufzeit | < 15s (warm) | ✅ |
| Erkannte Positionen | ≥ Tesseract | ✅ |
| Feld-Erkennungsquote | > 85% | ✅ |

---

## Sicherheit

### Port-Sicherheit
- ✅ Port 8002 nur `127.0.0.1` (localhost)
- ❌ KEIN öffentlicher Port
- ❌ KEIN Nginx-Proxy

### Datenschutz
- ✅ PDF wird NICHT committed (`.gitignore`)
- ✅ Output-Dateien werden NICHT committed
- ✅ Keine vollständigen Kundendaten in Logs

### Service-Isolation
- ✅ Eigenes Virtual Environment
- ✅ Keine globalen Python-Pakete
- ✅ Keine bestehenden Services stoppen
- ✅ Keine Production-Code-Änderung

---

## Troubleshooting

### "Port 8002 ist bereits belegt"
```bash
# Port-Belegung prüfen
ss -ltnp | grep 8002

# Falls belegt, anderen Port in Skripten ändern
# (aktuell nicht verwendet, nur für FastAPI geplant)
```

### "Weniger als 3 GB RAM frei"
```bash
# RAM-Verbrauch prüfen
free -h

# Andere Services temporär stoppen (optional)
# sudo systemctl stop <service>
```

### "Testdokument nicht gefunden"
```bash
# Prüfen
ls -lh /opt/paddleocr-spike/local-test-data/

# Ablegen
cp /pfad/marzouk-2026-00442.pdf /opt/paddleocr-spike/local-test-data/
```

### "PaddleOCR Import-Fehler"
```bash
# Virtual Environment aktivieren
source /opt/paddleocr-spike/venv/bin/activate

# Versionen prüfen
pip list | grep paddle

# Neu installieren
pip install --force-reinstall paddleocr paddlepaddle
```

---

## Dateien

```
/opt/paddleocr-spike/
├── install.sh              # Installation
├── run-test.sh             # Test ausführen
├── cleanup.sh              # Aufräumen
├── test_paddleocr.py       # Test-Skript (Python)
├── requirements.txt        # Python Dependencies
├── README.md               # Diese Datei
├── .gitignore              # Git-Ignore
├── local-test-data/        # PDF hier ablegen
│   └── marzouk-2026-00442.pdf  (NICHT committen!)
└── local-test-output/      # Ergebnisse
    ├── result.json         # Vollständiges Ergebnis
    ├── metrics.txt         # Kurz-Metriken
    ├── test-output.log     # Vollständiger Log
    ├── page-1-annotated.jpg  # Visualisierung
    └── page-2-annotated.jpg  # Visualisierung
```

---

## Nächste Schritte (NACH Test)

### A) Test erfolgreich → Integration planen
1. FastAPI-Mikroservice entwickeln
2. Spring Boot Integration
3. Docker Deployment
4. A/B-Test mit echten Rechnungen

### B) Test nicht erfolgreich → Bei Tesseract bleiben
1. Spike-Ordner aufräumen (`./cleanup.sh`)
2. Recherchebericht archivieren
3. Alternative Ansätze prüfen

---

## Support

Bei Problemen:
1. Test-Log prüfen: `cat local-test-output/test-output.log`
2. System-Status prüfen: `free -h && df -h`
3. Services prüfen: `systemctl status storebackend`

---

**Status**: ⏳ Bereit für Test auf Ubuntu VPS  
**Nächster Schritt**: Installation auf VPS durchführen (`./install.sh`)

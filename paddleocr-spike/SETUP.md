# PaddleOCR Spike - Schnellstart für Ubuntu VPS

## 1. Dateien auf VPS übertragen

### Option A: Via SCP (von lokalem Rechner)
```bash
# Von Windows/Mac/Linux zu Ubuntu VPS
cd /pfad/zu/storeBackend
scp -r paddleocr-spike user@your-vps-ip:/tmp/
```

### Option B: Via Git (auf VPS)
```bash
# Auf VPS
ssh user@your-vps-ip
cd /opt
sudo git clone https://github.com/Abiess/storeBackend.git temp-repo
sudo cp -r temp-repo/paddleocr-spike /opt/
sudo rm -rf temp-repo
cd /opt/paddleocr-spike
```

---

## 2. Installation

```bash
cd /opt/paddleocr-spike
chmod +x install.sh run-test.sh cleanup.sh
sudo ./install.sh
```

**Dauer**: ~5-10 Minuten

**Prüft**:
- ✅ RAM (mind. 3 GB frei)
- ✅ Disk (mind. 2 GB frei)
- ✅ Port 8002 frei
- ✅ Python 3 vorhanden
- ✅ Installiert System-Dependencies
- ✅ Erstellt Virtual Environment
- ✅ Installiert PaddleOCR

---

## 3. PDF-Testdokument ablegen

```bash
# Lokale Datei auf VPS kopieren
scp /pfad/zu/marzouk-2026-00442.pdf user@vps:/opt/paddleocr-spike/local-test-data/

# Oder auf VPS:
# cp /existing/path/marzouk-2026-00442.pdf /opt/paddleocr-spike/local-test-data/
```

**WICHTIG**: Diese Datei wird NICHT committed (siehe `.gitignore`)!

---

## 4. Test ausführen

```bash
cd /opt/paddleocr-spike
./run-test.sh
```

**Was passiert**:
1. System-Check (RAM, CPU, Services)
2. 3 Test-Runs (1x Cold, 2x Warm)
3. Metriken sammeln:
   - Laufzeit (Cold/Warm)
   - Peak RAM
   - CPU-Auslastung
   - Tabellen erkannt
   - Produktzeilen erkannt
   - Feld-Erkennungsquote

**Dauer**: ~3-5 Minuten

---

## 5. Ergebnisse prüfen

```bash
# Kurz-Übersicht
cat /opt/paddleocr-spike/local-test-output/metrics.txt

# Vollständiges JSON
cat /opt/paddleocr-spike/local-test-output/result.json

# Visualisierungen
ls -lh /opt/paddleocr-spike/local-test-output/*.jpg
```

---

## 6. Aufräumen (nach Test)

```bash
cd /opt/paddleocr-spike
./cleanup.sh
```

**Löscht**:
- `/opt/paddleocr-spike`
- `~/.paddleocr` (optional)

**Bewahrt**:
- Production-Services
- Production-Code

---

## Abbruchkriterien

**NICHT integrieren, falls**:
- ❌ Peak RAM > 3 GB
- ❌ Laufzeit > 30s (2 Seiten)
- ❌ Weniger Positionen als Tesseract
- ❌ Feld-Erkennungsquote < 70%

**Integrieren, falls**:
- ✅ Peak RAM < 2 GB
- ✅ Laufzeit < 15s (warm)
- ✅ Mehr Positionen als Tesseract
- ✅ Feld-Erkennungsquote > 85%

---

## Vollständige Anleitung

Siehe: [README.md](README.md)

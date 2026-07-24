# Supplier Invoice OCR - Deployment Guide

## Servervoraussetzungen

### Tesseract OCR Installation (Production)

**Einmalig auf dem Server ausführen:**

```bash
# System aktualisieren
sudo apt-get update

# Tesseract + Sprachpakete installieren
sudo apt-get install -y \
  tesseract-ocr \
  tesseract-ocr-deu \
  tesseract-ocr-eng \
  tesseract-ocr-fra \
  tesseract-ocr-ara

# Installation prüfen
tesseract --version
tesseract --list-langs
which tesseract
```

**Erwartete Ausgabe:**
```
tesseract 4.1.1 (oder höher)
List of available languages:
  ara
  deu
  eng
  fra
  osd
/usr/bin/tesseract
```

---

## Environment-Variablen (Optional)

**Falls Anpassungen nötig sind, in `/etc/storebackend.env` eintragen:**

```bash
# Tesseract-Pfad (falls nicht in PATH)
INVOICE_OCR_TESSERACT_COMMAND=/usr/bin/tesseract

# Sprachen für OCR (+ getrennt für Tesseract)
INVOICE_OCR_LANGUAGES=deu+eng

# DPI für PDF-Rendering (höher = bessere Qualität, mehr RAM)
INVOICE_OCR_DPI=300

# PSM-Modus (6 = Uniform block of text, Standard für Rechnungen)
INVOICE_OCR_PSM_MODE=6

# Timeout pro Dokument in Sekunden
INVOICE_OCR_TIMEOUT_SECONDS=60

# Maximale Seitenzahl pro Dokument
INVOICE_OCR_MAX_PAGES=20

# Maximale parallele OCR-Jobs (1 = sequenziell, empfohlen)
INVOICE_OCR_MAX_CONCURRENT_JOBS=1
```

**Standard-Werte (wenn nicht gesetzt):**
- `tesseract-command`: `tesseract` (im PATH)
- `languages`: `deu+eng` (Deutsch + Englisch)
- `dpi`: `300`
- `psm-mode`: `6`
- `timeout-seconds`: `60`
- `max-pages`: `20`
- `max-concurrent-jobs`: `1`

---

## Deployment-Ablauf

### 1. Tesseract prüfen (vor jedem Deployment)

```bash
# Auf dem Server:
ssh user@production-server

# Tesseract verfügbar?
command -v tesseract || echo "❌ Tesseract fehlt!"

# Version und Sprachen
tesseract --version
tesseract --list-langs | grep -E "deu|eng"
```

**Falls Tesseract fehlt:** Installation (siehe oben) durchführen

### 2. Backend deployen

```bash
# Normaler Deployment-Prozess
cd /opt/storebackend
./scripts/deploy.sh
```

**Oder GitHub Actions:**
- Push to `main` → automatisches Deployment

### 3. Service-Status prüfen

```bash
# Service-Status
systemctl status storebackend

# Logs prüfen (OCR-Initialisierung)
journalctl -u storebackend -n 100 --no-pager | grep -i ocr

# Erwartete Log-Zeile:
# ✅ OCR-Service initialisiert: maxJobs=1, dpi=300, psm=6, languages=deu+eng
```

### 4. Health-Check

```bash
# Backend gesund?
curl http://localhost:8080/actuator/health

# Erwartete Antwort:
# {"status":"UP","groups":["liveness","readiness"]}
```

---

## Erste OCR-Tests (manuell)

### Test mit echter Rechnung (2026_00442(2).pdf)

**Ziel:** OCR-Qualität messen, PSM-Modi vergleichen

#### PSM-Modus 3 testen
```bash
# API-Call mit PSM 3
curl -X POST "http://localhost:8080/api/stores/121/supplier-invoices/documents/{documentId}/ocr?psmMode=3" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Laufzeit, Zeichenanzahl, erkannte Werte dokumentieren
```

#### PSM-Modus 4 testen
```bash
# API-Call mit PSM 4
curl -X POST "http://localhost:8080/api/stores/121/supplier-invoices/documents/{documentId}/ocr?psmMode=4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PSM-Modus 6 testen (Standard)
```bash
# API-Call mit PSM 6
curl -X POST "http://localhost:8080/api/stores/121/supplier-invoices/documents/{documentId}/ocr?psmMode=6" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Sollwerte für Testrechnung (nur zur Bewertung)

**Erwartete Werte in der Beispielrechnung:**

| Feld | Erwarteter Wert |
|------|-----------------|
| Lieferant | Marzouk Handels GmbH |
| Rechnungsnummer | 2026/00442 |
| Rechnungsdatum | 08.05.2026 |
| Lieferdatum | 05.05.2026 |
| Nettobetrag | 1.543,40 EUR |
| MwSt. | 150,41 EUR |
| Gesamtbetrag | 1.693,81 EUR |

**OCR-Qualität bewerten:**
- ✅ **Gut:** Alle Werte korrekt erkannt
- ⚠️ **Ausreichend:** Rechnungsnummer, Datum, Gesamtbetrag erkannt
- ❌ **Unzureichend:** Weniger als 50% erkannt

---

## Ressourcen-Überwachung

### RAM-Verbrauch

```bash
# Vor OCR
free -h

# Während OCR (in anderem Terminal)
watch -n 1 free -h

# Nach OCR
free -h
```

**Erwartung:** ~200-500 MB RAM pro OCR-Job (2 Seiten @ 300 DPI)

### CPU-Auslastung

```bash
# Top-Prozesse
top -b -n 1 | head -20

# Nur Tesseract
ps aux | grep tesseract
```

**Erwartung:** 100% CPU für ~5-10 Sekunden pro Seite

### Temporäre Dateien

```bash
# Vor OCR
ls -lah /tmp/invoice-ocr-*

# Nach OCR (sollte leer sein)
ls -lah /tmp/invoice-ocr-*
```

**Erwartung:** Keine übrig gebliebenen Temp-Dateien

---

## Fehlerbehandlung

### Tesseract nicht gefunden

**Symptom:**
```json
{
  "status": "FAILED",
  "errorMessage": "Tesseract ist nicht installiert..."
}
```

**Lösung:**
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng
systemctl restart storebackend
```

### OCR-Timeout

**Symptom:**
```json
{
  "status": "FAILED",
  "errorMessage": "Tesseract-Timeout nach 60 Sekunden"
}
```

**Lösung:**
- Timeout erhöhen: `INVOICE_OCR_TIMEOUT_SECONDS=120`
- DPI reduzieren: `INVOICE_OCR_DPI=200`

### OCR-Service ausgelastet

**Symptom:**
```json
{
  "status": "FAILED",
  "errorMessage": "OCR-Service ausgelastet. Maximal 1 Job erlaubt."
}
```

**Lösung:**
- Warten bis aktueller Job fertig ist
- Oder `max-concurrent-jobs` erhöhen (nur bei genug RAM!)

---

## Produktions-Einstellungen (Empfohlen)

```bash
# Für Production VPS (2-4 GB RAM)
INVOICE_OCR_MAX_CONCURRENT_JOBS=1  # Sequenziell
INVOICE_OCR_DPI=300                # Gute Qualität
INVOICE_OCR_TIMEOUT_SECONDS=60     # Pro Dokument
INVOICE_OCR_MAX_PAGES=20           # Sicherheitsgrenze

# Für leistungsstarke Server (8+ GB RAM)
INVOICE_OCR_MAX_CONCURRENT_JOBS=2  # 2 parallele Jobs
INVOICE_OCR_DPI=300
INVOICE_OCR_TIMEOUT_SECONDS=90
INVOICE_OCR_MAX_PAGES=50
```

---

## Sicherheit

✅ **Implementiert:**
- ProcessBuilder (keine Shell-Injection)
- Timeout (verhindert hängende Prozesse)
- Semaphore (begrenzt Parallelität)
- Temporäre Verzeichnisse (UUID, automatisch gelöscht)
- Keine Rechnungsdaten in Logs

⚠️ **Beachten:**
- Tesseract läuft mit Backend-User-Rechten
- Temp-Dateien in `/tmp` (regelmäßig aufräumen)
- MinIO private bucket (nicht öffentlich!)

---

## Support

**Bei Problemen:**
1. Logs prüfen: `journalctl -u storebackend -f`
2. Tesseract testen: `tesseract --version`
3. RAM prüfen: `free -h`
4. Disk prüfen: `df -h`

**Dokumentation:**
- Tesseract: https://github.com/tesseract-ocr/tesseract
- PSM-Modi: `tesseract --help-psm`

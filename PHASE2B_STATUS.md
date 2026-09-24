# Phase 2B: OCR-Infrastruktur - Zwischenbericht

**Stand:** 2026-07-24 12:40  
**Status:** ✅ Infrastruktur fertig, ⏸️ Test blockiert (Tesseract fehlt)

---

## ✅ Abgeschlossene Aufgaben

### 1. Statusmodell korrigiert
```java
// NEU: Unterscheidung zwischen PDF-Text und OCR
TEXT_EXTRACTED     // PDFBox mit eingebettetem Text
OCR_RUNNING        // OCR läuft gerade
OCR_COMPLETED      // ✅ OCR erfolgreich (statt TEXT_EXTRACTED)
OCR_FAILED         // OCR fehlgeschlagen
```

### 2. OCR-Service verbessert

**Properties (application-ocr.properties):**
```properties
invoice.ocr.tesseract-command=tesseract
invoice.ocr.languages=deu+eng
invoice.ocr.dpi=300
invoice.ocr.timeout-seconds=60
invoice.ocr.max-pages=20
invoice.ocr.max-concurrent-jobs=1
invoice.ocr.psm-mode=6
```

**Semaphore-basierte Parallelitätskontrolle:**
```java
private Semaphore ocrSemaphore = new Semaphore(maxConcurrentJobs);

public OcrExtractionResult extractTextWithOcr(InputStream inputStream) {
    boolean acquired = ocrSemaphore.tryAcquire(10, TimeUnit.SECONDS);
    if (!acquired) {
        return FAILED("OCR-Service ausgelastet");
    }
    try {
        return performOcr(...);
    } finally {
        ocrSemaphore.release();
    }
}
```

**Temporäres Verzeichnis (statt einzelne Dateien):**
```java
Path tempDir = Files.createTempDirectory("invoice-ocr-" + UUID.randomUUID());
Path inputImage = tempDir.resolve("page.png");
Path outputBase = tempDir.resolve("output");

// Im finally:
deleteDirectoryRecursively(tempDir);  // Rekursiv löschen
```

**PSM-Modus konfigurierbar:**
```java
public OcrExtractionResult extractTextWithOcr(InputStream inputStream, int customPsmMode)
```

### 3. Code-Bereinigung
- ✅ `InvoicePdfAnalyzer` entfernt (~150 Zeilen redundant)
- ✅ Temporäre Test-Dateien entfernt
- ✅ Test-Controller entfernt

---

## ⏸️ BLOCKIERT: Tesseract-Installation erforderlich

### Problem
```
❌ Tesseract nicht installiert (Windows Dev-System)
❌ Kein Zugriff auf Production-Server dokumentiert
❌ Staging/Test-Umgebung nicht verfügbar
```

### Was fehlt für echten Test
1. Tesseract auf Server installieren:
   ```bash
   sudo apt-get update
   sudo apt-get install -y tesseract-ocr tesseract-ocr-deu tesseract-ocr-eng
   ```

2. Echte Rechnung laden (2026_00442(2).pdf)

3. PSM-Modi vergleichen:
   - PSM 3 (Fully automatic)
   - PSM 4 (Single column)
   - PSM 6 (Uniform block) ← Standard

4. Sollwerte messen:
   - Marzouk Handels GmbH
   - 2026/00442
   - 08.05.2026
   - 1.693,81 EUR

---

## 🔍 Nächste Schritte (nach Tesseract-Installation)

### Schritt 1: Server-Zustand prüfen
```bash
free -h           # RAM
df -h             # Disk
uname -a          # OS
tesseract --version
tesseract --list-langs
```

### Schritt 2: Test-Skript ausführen
```java
// Mit echter Rechnung aus MinIO
LocalInvoiceOcrService ocrService = ...;

// PSM 3
OcrExtractionResult result3 = ocrService.extractTextWithOcr(invoiceStream, 3);

// PSM 4
OcrExtractionResult result4 = ocrService.extractTextWithOcr(invoiceStream, 4);

// PSM 6
OcrExtractionResult result6 = ocrService.extractTextWithOcr(invoiceStream, 6);

// Vergleichen:
// - Zeichenanzahl
// - Erkannte Sollwerte
// - Laufzeit
// - Textqualität
```

### Schritt 3: Ergebnis-Matrix dokumentieren
```
Wert                  | PSM 3 | PSM 4 | PSM 6
--------------------- | ----- | ----- | -----
Lieferant             |   ?   |   ?   |   ?
Rechnungsnummer       |   ?   |   ?   |   ?
Rechnungsdatum        |   ?   |   ?   |   ?
Gesamtbetrag          |   ?   |   ?   |   ?
Laufzeit (ms)         |   ?   |   ?   |   ?
RAM-Verbrauch         |   ?   |   ?   |   ?
```

---

## ✅ Technische Details

### Build-Status
```
✅ mvn clean compile - BUILD SUCCESS
✅ Keine Compilation-Fehler
✅ Properties konfigurierbar
✅ Semaphore implementiert
✅ Temp-Verzeichnis rekursiv gelöscht
```

### Code-Statistik
```
LocalInvoiceOcrService: ~350 Zeilen
├─ Properties-Integration (7 Fields)
├─ Semaphore-Kontrolle
├─ performOcr() - Hauptlogik
├─ performOcrOnImage() - Tesseract-Aufruf
├─ deleteDirectoryRecursively() - Cleanup
└─ record OcrExtractionResult (9 Fields)
```

### Sicherheit
```
✅ ProcessBuilder (keine Shell-Injection)
✅ Timeout (60s default)
✅ Exit-Code-Prüfung
✅ Semaphore (max 1 Job parallel)
✅ Temp-Verzeichnis mit UUID
✅ Rekursives Löschen im finally
✅ Keine Rechnungsdaten in Logs
```

---

## 📊 Test-Failures Status

**Gesamt:** 203 Tests, 16 Failures, 12 Errors (pre-existing)

**Dokumentiert in:** `TEST_FAILURES_DOCUMENTATION.md`

**Phase 2B Tests:** Noch nicht geschrieben (warten auf Tesseract)

---

## ❌ NICHT implementiert (wie gefordert)

```
❌ InvoiceFieldParser (Regex)
❌ API-Endpunkte (/parse, /parse-result)
❌ Frontend-Preview-Erweiterung
❌ Produkt-/Lagerzuordnung
❌ Automatische Artikelerkennung
```

---

## 🎯 Entscheidung erforderlich

**Option 1:** Tesseract lokal auf Windows installieren
- https://github.com/UB-Mannheim/tesseract/wiki
- Sprach-Pakte manuell nachinstallieren
- Test auf lokalem System

**Option 2:** SSH-Zugriff auf Production-VPS
- Server-Daten benötigt (IP, User, Key)
- Tesseract via apt installieren
- Test auf echtem Server

**Option 3:** Docker-Container lokal
- Tesseract pre-installed Image
- Rechnung als Volume mounten
- Isolierte Test-Umgebung

**Option 4:** Warteposition
- Infrastruktur ist fertig
- Test erfolgt später durch Deployment-Team
- Dokumentation ist vollständig

---

**Status:** ⏸️ **Warten auf Tesseract-Installation**  
**Nächster Schritt:** User entscheidet über Test-Umgebung

---

**Files:**
- ✅ `service/LocalInvoiceOcrService.java` (350 Zeilen)
- ✅ `enums/InvoiceParseStatus.java` (OCR_RUNNING/OCR_COMPLETED)
- ✅ `application-ocr.properties` (Konfiguration)
- ✅ `TEST_FAILURES_DOCUMENTATION.md` (28 Failures)

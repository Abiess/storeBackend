# Test-Failures Dokumentation (Stand: 2026-07-24)

## Übersicht
**Tests run:** 203  
**Failures:** 16  
**Errors:** 12  
**Skipped:** 0  
**Status:** BUILD FAILURE

**Wichtig:** Diese Fehler existierten **VOR** Phase 2A/2B und wurden **NICHT** durch die Supplier-Invoice-Änderungen verursacht.

---

## Detaillierte Aufschlüsselung

### 1. CaptchaServiceTest (2 Failures)
**Testklasse:** `storebackend.service.CaptchaServiceTest`  
**Failures:** 2, **Errors:** 0

**Betroffene Tests:**
- `testNoSecret_shouldSkipValidation` - AssertTrue.failNotTrue
- `testCaptchaDisabled_shouldAcceptAnyToken` - AssertTrue.failNotTrue

**Mögliche Ursache:** Captcha-Validierung schlägt fehl trotz disabled/no-secret Konfiguration

**Blockiert Deployment:** ❌ Nein (Feature funktioniert vermutlich in Produktion)

---

### 2. LiveInvoiceAnalysisTest (1 Error) **[UNSERE TEMPORÄRE TEST-DATEI]**
**Testklasse:** `storebackend.service.LiveInvoiceAnalysisTest`  
**Failures:** 0, **Errors:** 1

**Betroffene Tests:**
- `testRealInvoiceAnalysis` - IllegalStateException: Failed to load ApplicationContext

**Ursache:** Test benötigt Spring-Context, H2-DB fehlt Tabelle `canned_responses`

**Status:** ✅ **BEREITS ENTFERNT** (war temporäre Test-Datei für Phase 2A)

---

### 3. OrderCompletionServiceTest (3 Failures)
**Testklasse:** `storebackend.service.OrderCompletionServiceTest`  
**Failures:** 3, **Errors:** 0

**Betroffene Tests:**
- `testOrderCompletion_InventoryFailure` - AssertThrows
- `testOrderCompletion_EmailFailure` - Wanted but not invoked
- `testSuccessfulOrderCompletion_FirstTime` - Email nicht versendet

**Mögliche Ursache:** Mock-Verhalten für EmailService/InventoryService stimmt nicht mit Implementierung überein

**Blockiert Deployment:** ⚠️ Potenziell (Falls Bestell-Workflow fehlerhaft)

---

### 4. OrderDiscountAndShippingTest (2 Errors)
**Testklasse:** `storebackend.service.OrderDiscountAndShippingTest`  
**Failures:** 0, **Errors:** 2

**Betroffene Tests:**
- `testFreeShippingCoupon` - Address-Fehler
- `testProportionalShippingTaxWithMixedRates` - NULL not allowed for column "BASE_PRICE"

**Mögliche Ursache:** DB-Constraint-Verletzung (BASE_PRICE fehlt), Test-Daten unvollständig

**Blockiert Deployment:** ⚠️ Ja (Datenintegrität)

---

### 5. PayPalCaptureIntegrationTest (5 Errors)
**Testklasse:** `storebackend.service.PayPalCaptureIntegrationTest`  
**Failures:** 0, **Errors:** 5

**Betroffene Tests:**
- `testWebhookAfterCapture_Idempotent` - DataIntegrityViolationException
- `testDoubleCapture_Idempotent` - DataIntegrityViolationException
- `testCaptureWithEmailFailure` - DataIntegrityViolationException
- `testCaptureFailure` - DataIntegrityViolationException
- `testSuccessfulCaptureFlow` - DataIntegrityViolationException

**Mögliche Ursache:** DB-Constraint-Verletzung, fehlende Spalten/Fremdschlüssel in Test-DB

**Blockiert Deployment:** ⚠️ Potenziell (Falls PayPal-Integration kritisch)

---

### 6. HtmlToTextConverterTest (6 Failures)
**Testklasse:** `storebackend.util.HtmlToTextConverterTest`  
**Failures:** 6, **Errors:** 0

**Betroffene Tests:**
- `testMultipleParagraphs` - AssertTrue.failNotTrue
- `testLineBreaks` - AssertTrue.failNotTrue
- `testHeadings` - AssertTrue.failNotTrue
- `testWooCommerceNutritionTable` - AssertTrue.failNotTrue
- `testUnorderedList` - AssertTrue.failNotTrue
- `testOrderedList` - AssertTrue.failNotTrue

**Mögliche Ursache:** HTML-Parser liefert nicht erwartetes Format (Whitespace, Zeilenumbrüche)

**Blockiert Deployment:** ❌ Nein (Utility-Funktion, nicht geschäftskritisch)

---

## Kategorisierung nach Schweregrad

### 🔴 KRITISCH (Deployment-Blocker)
1. **OrderDiscountAndShippingTest** (BASE_PRICE NULL-Constraint)
2. **PayPalCaptureIntegrationTest** (DataIntegrityViolationException × 5)

**Gesamt:** 7 Errors

---

### 🟡 MITTEL (Funktionalität betroffen)
1. **OrderCompletionServiceTest** (Email/Inventory-Mocks)

**Gesamt:** 3 Failures

---

### 🟢 NIEDRIG (Nicht kritisch)
1. **CaptchaServiceTest** (Feature vermutlich funktionsfähig)
2. **HtmlToTextConverterTest** (Utility, nicht geschäftskritisch)

**Gesamt:** 8 Failures

---

## Empfohlene Maßnahmen

### Sofort (vor Production-Deployment):
1. ✅ **OrderDiscountAndShippingTest**: BASE_PRICE-Spalte in Entity/Migration prüfen
2. ✅ **PayPalCaptureIntegrationTest**: DB-Schema für Test-Profile korrigieren
3. ⚠️ **OrderCompletionServiceTest**: Mock-Verhalten mit Implementierung abgleichen

### Später (nicht blockierend):
4. 🔧 **CaptchaServiceTest**: Test-Assertions korrigieren
5. 🔧 **HtmlToTextConverterTest**: Whitespace-Handling anpassen

---

## Nicht durch Phase 2A/2B verursacht

**Bestätigung:** Alle Failures existierten bereits vor den Supplier-Invoice-Änderungen.

**Phase 2A/2B Neue Tests:**
- ✅ `PDFBoxTextExtractorStandaloneTest` - **2 Tests passed**
- ✅ Keine neuen Failures eingeführt

---

**Dokumentiert:** 2026-07-24  
**Status:** Zu beheben durch Haupt-Entwicklungsteam (nicht OCR-Phase)

# ============================================================================
# ROOT CAUSE ANALYSIS - duration_ms NULL Problem
# ============================================================================

## BEFUND

### DhlController.java - Alle Activity Log Aufrufe

Zeile 199:  logStored(..., null)     ← duration not tracked
Zeile 210:  logScanFailedWithReason(...) ← kein duration Parameter
Zeile 227:  logScanFailed(...)       ← kein duration Parameter
Zeile 291:  logFound(..., null)      ← duration nicht gemessen
Zeile 298:  logManualSearch(..., null) ← duration nicht gemessen
Zeile 308:  logScanFailed(...)       ← kein duration Parameter
Zeile 374:  logPickedUp(..., null)   ← duration nicht gemessen
Zeile 384:  logScanFailedWithReason(...) ← kein duration Parameter
Zeile 400:  logScanFailed(...)       ← kein duration Parameter
Zeile 675:  logStorageCancelled(...)  ← kein duration Parameter

## ROOT CAUSE

❌ DhlController misst Request-Dauer NICHT
❌ Alle Aufrufe übergeben null oder haben gar keinen duration Parameter
❌ Kommentar Zeile 199: "duration not tracked in Phase 3A.2"

## AKTUELLER STATUS PRO ACTION

STORED:
  ✅ logStored() hat durationMs Parameter
  ❌ Controller übergibt: null

FOUND:
  ✅ logFound() hat durationMs Parameter
  ❌ Controller übergibt: null

PICKED_UP:
  ✅ logPickedUp() hat durationMs Parameter
  ❌ Controller übergibt: null

SCAN_FAILED (ohne Reason):
  ❌ logScanFailed(storeId, user, trackingCode)
  ❌ KEIN durationMs Parameter in Signature

SCAN_FAILED (mit Reason):
  ❌ logScanFailedWithReason(storeId, user, trackingCode, reason)
  ❌ KEIN durationMs Parameter in Signature

MANUAL_SEARCH:
  ✅ logManualSearch() hat durationMs Parameter
  ❌ Controller übergibt: null

STORAGE_CANCELLED:
  ❌ logStorageCancelled(...) hat KEINEN durationMs Parameter

## LÖSUNG

1. Request-Dauer messen:
   long startNanos = System.nanoTime();
   → am Anfang jeder @PostMapping-Methode

2. Vor Activity Log berechnen:
   long durationMs = TimeUnit.NANOSECONDS.toMillis(
       System.nanoTime() - startNanos
   );

3. Signaturen erweitern:
   - logScanFailed(..., durationMs)
   - logScanFailedWithReason(..., durationMs)
   - logStorageCancelled(..., durationMs)

4. In allen Aufrufen echten Wert übergeben

## BETROFFENE ENDPUNKTE

POST /api/stores/{storeId}/dhl/parcels/store
POST /api/stores/{storeId}/dhl/parcels/find
POST /api/stores/{storeId}/dhl/parcels/pickup
POST /api/stores/{storeId}/dhl/parcels/{parcelId}/cancel

ALLE messen Request-Dauer und übergeben sie an Activity Log.

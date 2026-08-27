# ============================================================================
# DURATION_MS NULL FIX - WORK IN PROGRESS
# ============================================================================

## STATUS

⚠️ IN PROGRESS - Noch nicht vollständig

## DURCHGEFÜHRT

### 1. Root Cause Analysis COMPLETE ✅
- DhlController misst Request-Dauer NICHT
- Alle Activity Log Aufrufe übergeben null oder fehlendem duration Parameter
- Identifiziert: 4 Endpunkte (store, find, pickup, cancel)

### 2. Service-Signaturen erweitert ✅
✅ logScanFailed(... ,durationMs)
✅ logScanFailedWithReason(..., durationMs)
✅ logStorageCancelled(..., durationMs)

### 3. DhlController - TEILWEISE ✅
✅ TimeUnit import hinzugefügt
✅ storeParcel: startNanos + durationMs Tracking
✅ findParcel: startNanos hinzugefügt (nicht vollständig)
✅ pickupParcel: (nicht vollständig)
✅ cancelParcel: startNanos + durationMs

## VERBLEIBENDE ARBEIT

❌ findParcel Endpoint: durationMs Übergabe in allen Pfaden
❌ pickupParcel Endpoint: startNanos + durationMs vollständig

❌ Build Fehler beheben:
   - Einige logScanFailed Aufrufe haben falsche Parameter-Reihenfolge
   - logStorageCancelled Parameter-Reihenfolge

## NÄCHSTE SCHRITTE

1. findParcel & pickupParcel vollständig mit duration tracking
2. Alle Compile-Fehler beheben
3. mvn clean compile -DskipTests → BUILD SUCCESS
4. Test mit echten Requests
5. DB prüfen: duration_ms != NULL

CHECKPOINT NICHT ERREICHT

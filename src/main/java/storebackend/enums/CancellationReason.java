package storebackend.enums;

/**
 * Gründe für Stornierung einer Paket-Einlagerung
 * 
 * Phase 3A.4 - Paket-Korrektur
 * 
 * Verwendet wenn ein Mitarbeiter eine fehlerhafte Einlagerung
 * rückgängig macht.
 */
public enum CancellationReason {
    /**
     * Falscher Tracking-Code gescannt
     * z.B. Nachbar-Paket versehentlich erfasst
     */
    WRONG_SCAN,
    
    /**
     * Falsches Paket eingelagert
     * z.B. Verwechslung bei mehreren Paketen
     */
    WRONG_PARCEL,
    
    /**
     * Testscan während Systemeinrichtung/-test
     */
    TEST_SCAN,
    
    /**
     * Tracking-Code wurde versehentlich doppelt erfasst
     */
    DUPLICATE_ENTRY,

    /**
     * Manuelle Entfernung über die Lagerverwaltung (Teil 2)
     * z.B. Bereinigung von Test-/Fehleinlagerungen über das
     * Lagerfach-Detail-Panel, ohne dass einer der spezifischeren
     * Gründe (falscher Scan/falsches Paket/Duplikat) zutrifft.
     */
    MANUAL_REMOVAL,

    /**
     * Administratives Zurücksetzen des gesamten virtuellen Lagers (Teil B).
     * Wird für JEDES betroffene Paket einzeln als STORAGE_CANCELLED-Aktivität
     * protokolliert (siehe DhlParcelService.resetWarehouse()), damit die
     * Paket-Historie trotz Bulk-Aktion nachvollziehbar bleibt.
     */
    WAREHOUSE_RESET,

    /**
     * Sonstige Gründe
     * (Freitext-Note sollte angegeben werden)
     */
    OTHER
}

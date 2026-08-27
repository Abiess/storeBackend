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
     * Sonstige Gründe
     * (Freitext-Note sollte angegeben werden)
     */
    OTHER
}

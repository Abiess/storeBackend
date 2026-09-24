package storebackend.enums;

/**
 * DHL Activity Log Actions
 * 
 * Protokollierte Aktionen im DHL-Paket-Management
 * 
 * Phase 3A.2 - Audit Log
 */
public enum DhlActivityAction {
    /**
     * Paket wurde eingelagert (erfolgreich)
     */
    STORED,
    
    /**
     * Paket wurde gesucht (erfolgreich gefunden)
     */
    FOUND,
    
    /**
     * Paket wurde abgeholt (erfolgreich)
     */
    PICKED_UP,
    
    /**
     * Scan-Versuch fehlgeschlagen
     * (z.B. Barcode unleserlich, Paket nicht in System)
     */
    SCAN_FAILED,
    
    /**
     * Manuelle Suche durchgeführt
     * (z.B. User hat im System nach Tracking-Code gesucht)
     */
    MANUAL_SEARCH,
    
    /**
     * Einlagerung storniert (Phase 3A.4 - Paket-Korrektur)
     * 
     * Verwendet wenn ein fehlerhaft eingelagertes Paket korrigiert wird:
     * - Fehlscan
     * - Falsches Paket
     * - Testscan
     * - Doppelte Erfassung
     * 
     * Die ursprüngliche STORED-Aktion bleibt erhalten,
     * STORAGE_CANCELLED wird zusätzlich protokolliert
     */
    STORAGE_CANCELLED
}

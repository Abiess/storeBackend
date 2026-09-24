package storebackend.enums;

/**
 * DHL Parcel Status
 * 
 * Status-Lifecycle:
 * STORED -> PICKED_UP (normal flow)
 * STORED -> CANCELLED (correction flow, Phase 3A.4)
 * 
 * Phase 3A.4 - Paket-Korrektur:
 * CANCELLED Pakete sind nicht mehr aktiv im Lagerbestand
 */
public enum DhlParcelStatus {
    /**
     * Paket ist eingelagert und wartet auf Abholung
     */
    STORED,
    
    /**
     * Paket wurde vom Kunden abgeholt
     */
    PICKED_UP,
    
    /**
     * Einlagerung wurde storniert (Phase 3A.4)
     * 
     * Gründe:
     * - Fehlscan
     * - Falsches Paket
     * - Testscan
     * - Doppelte Erfassung
     * 
     * WICHTIG:
     * - Paket ist nicht mehr im aktiven Lagerbestand
     * - Lagerplatz-Kapazität wieder frei
     * - Tracking-Code kann neu verwendet werden (Partial Unique Constraint)
     * - Audit-Historie bleibt vollständig erhalten
     */
    CANCELLED
}

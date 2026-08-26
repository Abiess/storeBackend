package storebackend.enums;

/**
 * DHL Parcel Status
 * 
 * Status-Lifecycle:
 * STORED -> PICKED_UP
 */
public enum DhlParcelStatus {
    /**
     * Paket ist eingelagert und wartet auf Abholung
     */
    STORED,
    
    /**
     * Paket wurde vom Kunden abgeholt
     */
    PICKED_UP
}

package storebackend.dto;

/**
 * Status eines E-Mail-Versands
 */
public enum EmailDeliveryStatus {
    /** E-Mail wurde erfolgreich versendet */
    SENT,
    
    /** Temporärer Fehler (z.B. Daily Limit, Netzwerk) - Retry möglich */
    TEMPORARILY_FAILED,
    
    /** Permanenter Fehler (z.B. Auth-Fehler, ungültige Empfänger) */
    PERMANENTLY_FAILED
}

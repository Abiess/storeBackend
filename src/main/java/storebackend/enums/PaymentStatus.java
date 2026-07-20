package storebackend.enums;

/**
 * Payment Status - Provider-unabhängiger Zahlungsstatus
 * Gilt für PaymentTransaction Entity
 */
public enum PaymentStatus {
    CREATED,           // Payment-Record erstellt, noch keine Aktion
    PENDING_APPROVAL,  // PayPal Order erstellt, wartet auf Käufer-Genehmigung
    APPROVED,          // Käufer hat genehmigt, noch kein Capture
    PENDING,           // Capture durchgeführt, aber noch nicht abgeschlossen (z.B. eCheck)
    PAID,              // Erfolgreich bezahlt und abgeschlossen
    FAILED,            // Fehlgeschlagen
    CANCELLED,         // Abgebrochen
    REFUNDED,          // Vollständig erstattet
    PARTIALLY_REFUNDED // Teilweise erstattet
}

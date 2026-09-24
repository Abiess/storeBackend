package storebackend.enums;

/**
 * Order Status - Bestellstatus
 * 
 * Flow für Online-Zahlungen (PayPal):
 * PENDING_PAYMENT → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
 * PENDING_PAYMENT → PAYMENT_FAILED (bei Zahlung-Fehler)
 * 
 * Flow für COD/Pickup:
 * CONFIRMED → PROCESSING → SHIPPED → DELIVERED
 */
public enum OrderStatus {
    PENDING,            // Initial (wird meist direkt zu PENDING_PAYMENT oder CONFIRMED)
    PENDING_PAYMENT,    // Wartet auf Zahlungsbestätigung (PayPal, Banküberweisung)
    PAYMENT_FAILED,     // Zahlung fehlgeschlagen (PayPal Fehler, Abbruch)
    CONFIRMED,          // Bestätigt und bezahlt (oder COD)
    PROCESSING,         // In Bearbeitung
    SHIPPED,            // Versendet
    DELIVERED,          // Zugestellt
    CANCELLED,          // Storniert
    REFUNDED            // Erstattet
}


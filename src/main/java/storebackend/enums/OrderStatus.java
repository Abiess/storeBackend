package storebackend.enums;

/**
 * Order Status - Bestellstatus
 * PENDING_PAYMENT: Wartet auf Zahlungsbestätigung (wichtig für PayPal/Online-Zahlungen)
 */
public enum OrderStatus {
    PENDING,
    PENDING_PAYMENT,    // NEU: Wartet auf Zahlungsbestätigung
    CONFIRMED,
    PROCESSING,
    SHIPPED,
    DELIVERED,
    CANCELLED,
    REFUNDED
}


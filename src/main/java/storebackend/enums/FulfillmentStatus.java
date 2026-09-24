package storebackend.enums;

/**
 * Fulfillment Status für Dropshipping Order Items
 * Trackt den Fulfillment-Prozess vom Reseller zum Supplier
 */
public enum FulfillmentStatus {
    /**
     * Noch nicht beim Supplier bestellt
     */
    PENDING,

    /**
     * Bei Supplier bestellt (manuell oder via API)
     */
    ORDERED,

    /**
     * Supplier hat Ware versendet
     */
    SHIPPED,

    /**
     * Kunde hat Ware erhalten
     */
    DELIVERED,

    /**
     * Storniert (vor Versand)
     */
    CANCELLED
}


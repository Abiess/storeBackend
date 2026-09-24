package storebackend.enums;

/**
 * Types of delivery providers available in the system
 */
public enum DeliveryProviderType {
    /**
     * In-house delivery by store's own fleet
     */
    IN_HOUSE,

    /**
     * Manual dispatch via WhatsApp
     */
    WHATSAPP_DISPATCH,

    /**
     * Manual order processing
     */
    MANUAL,

    /**
     * Placeholder for future external integrations (DHL, UPS, etc.)
     */
    EXTERNAL_PLACEHOLDER
}


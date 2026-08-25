package storebackend.enums;

/**
 * Order Source - Herkunft der Bestellung
 * 
 * Unterscheidet zwischen verschiedenen Verkaufskanälen
 * für Analytics, Reporting und kanalspezifische Logik
 */
public enum OrderSource {
    /**
     * Online-Bestellung über Storefront
     * Default für bestehende Orders ohne orderSource
     */
    ONLINE,
    
    /**
     * Point of Sale - Verkauf über POS-System
     * Direkter Verkauf vor Ort mit CASH oder CARD_EXTERNAL
     */
    POS,
    
    /**
     * B2B-Portal Bestellung
     * Bestellung über B2B-Kundenportal
     */
    B2B,
    
    /**
     * API/Webhook Import
     * Externe Bestellung über REST API oder Webhook
     */
    API
}

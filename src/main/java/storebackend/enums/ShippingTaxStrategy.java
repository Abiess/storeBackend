package storebackend.enums;

/**
 * Strategie zur Besteuerung der Versandkosten
 * 
 * STORE_DEFINED: Fester Steuersatz (vom Store konfiguriert)
 * PROPORTIONAL_TO_CART: Proportional zum Warenkorb (gemischte Steuersätze)
 * STANDARD_RATE: Immer Standardsteuersatz verwenden
 */
public enum ShippingTaxStrategy {
    STORE_DEFINED,        // Fester Steuersatz aus Store-Einstellungen
    PROPORTIONAL_TO_CART, // Anteilig nach Warenkorbwert
    STANDARD_RATE         // Immer Standardsteuersatz
}

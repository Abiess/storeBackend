package storebackend.enums;

/**
 * Preismodell: Brutto (inkl. MwSt.) oder Netto (+ MwSt.)
 * 
 * GROSS: Standardmäßig für B2C in Deutschland
 * NET: Für B2B oder internationale Geschäfte
 */
public enum PriceMode {
    GROSS,  // Bruttopreise (inkl. Umsatzsteuer)
    NET     // Nettopreise (zzgl. Umsatzsteuer)
}

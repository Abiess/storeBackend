package storebackend.enums;

/**
 * Steuerkategorien für Produkte
 * 
 * STANDARD: Regulärer Steuersatz (19% in Deutschland)
 * REDUCED: Ermäßigter Steuersatz (7% in Deutschland, z.B. Lebensmittel, Bücher)
 * ZERO: Nullsteuersatz (0%, aber umsatzsteuerpflichtig)
 * EXEMPT: Steuerfrei (0%, nicht umsatzsteuerpflichtig, z.B. Kleinunternehmer)
 */
public enum TaxCategory {
    STANDARD,  // 19%
    REDUCED,   // 7%
    ZERO,      // 0% (umsatzsteuerpflichtig)
    EXEMPT     // Steuerfrei
}

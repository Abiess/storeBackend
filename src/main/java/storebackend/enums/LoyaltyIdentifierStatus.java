package storebackend.enums;

/**
 * Loyalty Identifier Status
 *
 * Status eines Karten-/Kundencodes (LoyaltyIdentifier).
 * MVP: Codes werden manuell eingegeben. Später identisch für NFC-Karten-UIDs nutzbar.
 */
public enum LoyaltyIdentifierStatus {
    /** Code/Karte ist aktiv und kann verwendet werden */
    ACTIVE,

    /** Code/Karte wurde gesperrt (z.B. verloren, gestohlen) */
    BLOCKED,

    /** Code/Karte wurde durch eine neue ersetzt (z.B. Migration auf NFC-UID) */
    REPLACED
}

package storebackend.enums;

/**
 * Loyalty Transaction Type
 *
 * Beschreibt die Art einer Punktebuchung auf einem LoyaltyAccount.
 * Jede Punkteänderung MUSS über eine LoyaltyTransaction erfolgen (Audit-Trail).
 */
public enum LoyaltyTransactionType {
    /** Punkte wurden durch einen Einkauf gutgeschrieben */
    EARN,

    /** Punkte wurden eingelöst (Redemption) */
    REDEEM,

    /** Manuelle Korrektur durch Store-Admin (z.B. Stornierung, Bonus) */
    ADJUST
}

package storebackend.enums;

/**
 * Credit Transaction Type
 *
 * Beschreibt die Art einer Buchung auf einem CustomerCreditAccount
 * (Anschreiben/Kredit). Jede Änderung von
 * {@code CustomerCreditAccount.balanceOwed} MUSS über eine
 * CreditTransaction erfolgen (Audit-Trail, analog zu
 * {@link LoyaltyTransactionType}/LoyaltyAccount.pointsBalance).
 *
 * ADJUSTMENT und REVERSAL sind bereits vorbereitet, auch wenn initial nur
 * CHARGE/PAYMENT verwendet werden - damit Storno/Retoure später ohne
 * erneute Migration ergänzt werden kann.
 */
public enum CreditTransactionType {
    /** Anschreiben: Kunde kauft auf Kredit, offener Betrag steigt */
    CHARGE,

    /** Zahlung erfasst: Kunde begleicht (Teil seines) offenen Betrag */
    PAYMENT,

    /** Manuelle Korrektur durch Store-Admin */
    ADJUSTMENT,

    /** Storno/Retoure einer vorherigen Buchung */
    REVERSAL
}

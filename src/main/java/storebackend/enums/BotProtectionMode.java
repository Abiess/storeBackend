package storebackend.enums;

/**
 * Bot-Schutzmodus für Store-Bestellungen.
 * Händler können pro Store einstellen, wie streng Bot-Schutz sein soll.
 *
 * - OFF: Kein Bot-Schutz (nur für Test-Stores empfohlen)
 * - SUSPICIOUS_ONLY: Nur verdächtige Anfragen prüfen (empfohlen)
 * - ALWAYS_ON: Jede Bestellung erfordert Verifizierung
 */
public enum BotProtectionMode {
    /**
     * Bot-Schutz deaktiviert.
     * WARNUNG: Erlaubt unbegrenzte automatisierte Bestellungen!
     */
    OFF,

    /**
     * Bot-Schutz nur für verdächtige Anfragen (empfohlen).
     * Prüft: Hohe Order-Frequenz, verdächtige IPs, ungewöhnliche Muster.
     */
    SUSPICIOUS_ONLY,

    /**
     * Strenger Bot-Schutz immer aktiv.
     * Jede Bestellung erfordert zusätzliche Verifizierung (z.B. Phone-Verification).
     */
    ALWAYS_ON
}

package storebackend.dto.dhl;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ⚠️ TEMPORÄRER TEST-DTO - NICHT für den produktiven Einsatz gedacht!
 *
 * Ergebnis eines kontrollierten Test-Aufrufs von DHL "d-get-piece-detail"
 * (Geschäftskunden-/GKP-Abfrage) mit zusätzlich übergebener Empfänger-PLZ
 * (zip-code). Ziel: prüfen, ob DHL dadurch zusätzliche Empfängerdaten
 * (z.B. Empfängername) zurückliefert.
 *
 * Dieses DTO dient AUSSCHLIESSLICH der Testauswertung und soll nach
 * Abschluss des Tests wieder entfernt werden.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DhlPieceDetailTestResult {

    /** Ursprünglich eingegebener Tracking-Code */
    private String trackingCode;

    /** DHL Response Code (z.B. "0", "100") */
    private String dhlResponseCode;

    /** PLZ, die tatsächlich im Test-Request an DHL gesendet wurde */
    private String zipCodeSent;

    /**
     * true, wenn die zum Testzeitpunkt verwendete zip-code NICHT vom Aufrufer
     * übergeben wurde, sondern der temporäre Test-Default (90409) verwendet wurde.
     */
    private boolean zipCodeIsTestDefault;

    /** Ist irgendein Empfängername-Feld in der DHL-Response vorhanden? */
    private boolean recipientNamePresent;

    /** Wert des gefundenen Empfängernamens (falls vorhanden) */
    private String recipientName;

    /** Name des XML-Attributs/-Elements, aus dem der Empfängername gelesen wurde */
    private String recipientNameSourceField;

    /** Sendungsstatus (falls von DHL zusätzlich geliefert) */
    private String shipmentStatus;

    // --- Optionale, rein informative Empfänger-Adressfelder (kein Einfluss ---
    // --- auf recipientNamePresent/recipientName) -----------------------------

    /** Wert des DHL-Attributs "recipient-street" (falls vorhanden) */
    private String recipientStreet;

    /** Wert des DHL-Attributs "recipient-city" (falls vorhanden) */
    private String recipientCity;

    /** Wert des DHL-Attributs "pan-recipient-street" (falls vorhanden) */
    private String panRecipientStreet;

    /** Wert des DHL-Attributs "pan-recipient-city" (falls vorhanden) */
    private String panRecipientCity;

    /** Wert des DHL-Attributs "pan-recipient-address" (falls vorhanden) */
    private String panRecipientAddress;
}

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

    /** Sendungsstatus - Wert des DHL-Attributs "status" aus dem piece-shipment-Element */
    private String shipmentStatus;

    // --- Felder ausschließlich aus dem <data name="piece-shipment"> Element ---
    // --- (NICHT rekursiv im gesamten Dokument gesucht) -------------------------

    /** Wert des DHL-Attributs "recipient-street" (piece-shipment-Element) */
    private String recipientStreet;

    /** Wert des DHL-Attributs "recipient-city" (piece-shipment-Element) */
    private String recipientCity;

    /** Wert des DHL-Attributs "pan-recipient-address" (piece-shipment-Element) */
    private String panRecipientAddress;

    /** Wert des DHL-Attributs "pan-recipient-name" (piece-shipment-Element) */
    private String panRecipientName;

    /** Wert des DHL-Attributs "error-status" (piece-shipment-Element) */
    private String errorStatus;

    /** Wert des DHL-Attributs "piece-status" (piece-shipment-Element) */
    private String pieceStatus;

    /** Wert des DHL-Attributs "piece-status-desc" (piece-shipment-Element) */
    private String pieceStatusDesc;

    /** Wert des DHL-Attributs "short-status" (piece-shipment-Element) */
    private String shortStatus;

    // --- Felder DIREKT vom äußeren Root-Element (NICHT rekursiv) ---------------

    /** Wurzel-Elementname der geparsten DHL-Response (Tag-Name, z.B. "data") */
    private String responseRootName;

    /** Wert des Root-Attributs "name" */
    private String rootName;

    /** Wert des Root-Attributs "error", falls vorhanden */
    private String dhlError;

    /** Wert des Root-Attributs "request-id", falls vorhanden */
    private String dhlRequestId;

    /**
     * true, wenn das XML-Parsing der DHL-Response erfolgreich war.
     * false, wenn das Parsing fehlgeschlagen ist (Fehler wurde auf ERROR-Ebene
     * protokolliert, NICHT stillschweigend verschluckt) oder die Response leer war.
     */
    @Builder.Default
    private boolean parseSuccessful = true;
}

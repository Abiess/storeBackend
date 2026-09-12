package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.enums.MaritimePort;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Diagnose-Tests für das AIS-Empfangsproblem NADOR/CASABLANCA (vesselCount=0 trotz
 * connected=true/configured=true/healthy=true, während TANGER_MED normal Daten liefert).
 *
 * Zweck: die exakte, tatsächlich an AISStream gesendete Subscription-Payload sowie die
 * BoundingBox-Geometrie PROGRAMMATISCH verifizieren (nicht nur die Java-Konfiguration lesen),
 * ohne eine echte WebSocket-Verbindung/API-Key zu benötigen. Deckt damit die möglichen Ursachen
 * A) falsche BoundingBox und B) falsches Subscription-JSON ab.
 *
 * {@link AisStreamClientService#buildSubscriptionJson(String, MaritimePort)} ist package-private
 * und wird von {@code sendSubscription(WebSocket)} 1:1 für den echten WebSocket-Versand genutzt -
 * dieser Test prüft also exakt den Payload, der auch produktiv an
 * {@code wss://stream.aisstream.io/v0/stream} gesendet wird (kein Test-Double/Duplikat).
 */
class AisStreamSubscriptionDiagnosticsTest {

    private static final String FAKE_KEY = "test-key-not-a-real-secret";

    @Test
    void subscriptionJson_tangerMed_hasExpectedStructureAndBoundingBox() {
        String json = AisStreamClientService.buildSubscriptionJson(FAKE_KEY, MaritimePort.TANGER_MED);
        assertEquals(
                "{\"APIKey\":\"test-key-not-a-real-secret\","
                        + "\"BoundingBoxes\":[[[35.75,-5.65],[36.05,-5.2]]],"
                        + "\"FilterMessageTypes\":[\"PositionReport\",\"ShipStaticData\"]}",
                json);
        assertNoFilterShipMmsiField(json);
    }

    @Test
    void subscriptionJson_nador_hasExpectedStructureAndEnlargedDiagnosticBoundingBox() {
        String json = AisStreamClientService.buildSubscriptionJson(FAKE_KEY, MaritimePort.NADOR);
        assertEquals(
                "{\"APIKey\":\"test-key-not-a-real-secret\","
                        + "\"BoundingBoxes\":[[[34.8,-4.0],[36.0,-1.5]]],"
                        + "\"FilterMessageTypes\":[\"PositionReport\",\"ShipStaticData\"]}",
                json);
        assertNoFilterShipMmsiField(json);
    }

    @Test
    void subscriptionJson_casablanca_hasExpectedStructureAndEnlargedDiagnosticBoundingBox() {
        String json = AisStreamClientService.buildSubscriptionJson(FAKE_KEY, MaritimePort.CASABLANCA);
        assertEquals(
                "{\"APIKey\":\"test-key-not-a-real-secret\","
                        + "\"BoundingBoxes\":[[[32.9,-8.5],[34.3,-6.5]]],"
                        + "\"FilterMessageTypes\":[\"PositionReport\",\"ShipStaticData\"]}",
                json);
        assertNoFilterShipMmsiField(json);
    }

    @Test
    void subscriptionJson_apiKeyIsEscapedAndNeverTruncated() {
        // Regression: ein API-Key mit Anführungszeichen/Backslash darf das JSON nicht zerstören.
        String json = AisStreamClientService.buildSubscriptionJson("weird\"key\\value", MaritimePort.TANGER_MED);
        assertTrue(json.contains("\"APIKey\":\"weird\\\"key\\\\value\""));
    }

    private static void assertNoFilterShipMmsiField(String json) {
        // Ursache-Ausschluss: es wird bewusst KEIN FilterShipMMSI gesendet (kein MMSI-Filter aktiv,
        // der Schiffe versehentlich ausschließen könnte).
        assertFalse(json.contains("FilterShipMMSI"));
    }

    /**
     * ZIEL 5 (Golden Bridge als Nador-Referenz): MMSI 209410000, reale Position 35.27228 N /
     * 2.92535 W, muss innerhalb der (vergrößerten Diagnose-)AIS-Empfangsbox von NADOR liegen -
     * unabhängig von portZoneBox/approachZone/PortStatusCalculator (siehe MaritimePort.isWithinBoundingBox,
     * bewusst getrennt von der Status-Ableitung).
     */
    @Test
    void goldenBridgeReferencePosition_isWithinNadorReceiveBoundingBox() {
        assertTrue(MaritimePort.NADOR.isWithinBoundingBox(35.27228, -2.92535));
    }

    @Test
    void goldenBridgeReferencePosition_isOutsideCasablancaAndTangerMedBoundingBox() {
        // Kontrollprüfung: der Referenzpunkt darf NICHT versehentlich auch in den anderen Boxen liegen
        // (sonst wäre die Geometrie zu grob/überlappend gewählt).
        assertFalse(MaritimePort.CASABLANCA.isWithinBoundingBox(35.27228, -2.92535));
        assertFalse(MaritimePort.TANGER_MED.isWithinBoundingBox(35.27228, -2.92535));
    }
}

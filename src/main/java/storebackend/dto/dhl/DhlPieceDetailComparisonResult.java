package storebackend.dto.dhl;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ⚠️ TEMPORÄRER TEST-DTO - NICHT für den produktiven Einsatz gedacht!
 *
 * Ergebnis-Container für den zweistufigen DHL-Support-Test (Ticket #311719):
 *
 * - testA: exakte DHL-Support-Vorlage OHNE zip-code
 * - testB: dieselbe Vorlage MIT zip-code="90409" (Vergleichstest),
 *          wird NUR ausgeführt, wenn testA erfolgreich war
 *
 * Dieses DTO dient AUSSCHLIESSLICH der Testauswertung und soll nach
 * Abschluss des Tests wieder entfernt werden.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DhlPieceDetailComparisonResult {

    /** Test A: exakte DHL-Support-Vorlage ohne zip-code */
    private DhlPieceDetailTestResult testA;

    /**
     * Test B: gleiche Vorlage mit zip-code="90409" (Vergleichstest).
     * Bleibt null, wenn Test A nicht erfolgreich war und Test B deshalb
     * nicht ausgeführt wurde.
     */
    private DhlPieceDetailTestResult testB;

    /** true, wenn Test B ausgeführt wurde (d.h. Test A erfolgreich war) */
    private boolean testBExecuted;

    /** Kurzer Hinweis, falls Test B übersprungen wurde */
    private String testBSkippedReason;
}

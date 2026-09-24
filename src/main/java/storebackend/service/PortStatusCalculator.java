package storebackend.service;

import storebackend.enums.MaritimePort;
import storebackend.enums.VesselPortStatus;

/**
 * Leitet einen einfachen, nachvollziehbaren operativen Status ({@link VesselPortStatus}) für ein
 * Schiff ab – Phase 2A des Maritime-Features ("Port Operations").
 *
 * MVP-Regeln (bewusst einfach gehalten, siehe Aufgabenstellung):
 *  - Position INNERHALB der Port-Zone + AIS-NavigationalStatus meldet explizit "moored"/"at anchor",
 *    UND Geschwindigkeit ist NICHT deutlich hoch (siehe Hinweis unten zu navStatus=5/1)           => MOORED
 *  - Position INNERHALB der Port-Zone + sehr niedrige Geschwindigkeit + NavigationalStatus fehlt,
 *    ist "undefined"(15) oder meldet "underway using engine"(0)                                  => MOORED
 *    (heuristischer Fallback bei widersprüchlichen AIS-Daten, siehe Hinweis unten)
 *  - Position INNERHALB der Port-Zone + sehr niedrige Geschwindigkeit + NavigationalStatus
 *    explizit "underway sailing"(8)                                                              => IN_PORT
 *  - Position INNERHALB der Port-Zone + höhere Geschwindigkeit, Kurs vom Zentrum WEG            => DEPARTING
 *  - Position INNERHALB der Port-Zone, sonst (langsam bewegend/manövrierend)                    => IN_PORT
 *  - Position AUSSERHALB der Port-Zone, AIS-NavigationalStatus meldet explizit "moored"          => MOORED
 *    (eindeutiges Schiffs-Signal überstimmt die – notwendigerweise grobe – Zonen-Box)
 *  - Position AUSSERHALB der Port-Zone, aber innerhalb der Approach-Zone, Kurs zum Zentrum HIN       => APPROACHING
 *  - Position AUSSERHALB der Approach-Zone                                                          => NEAR_PORT
 *    (auch bei zufällig passendem Kurs – reiner Durchgangsverkehr weit außerhalb des Hafens gilt
 *    nicht als "Richtung Hafen", siehe MaritimePort-Klassendoku)
 *  - Position AUSSERHALB der Port-Zone, sonst (auch SOG~0, z.B. vor Anker liegend)               => NEAR_PORT
 *  - Fehlende Position                                                                          => UNKNOWN
 *
 * WICHTIG: IN_PORT/MOORED/DEPARTING werden AUSSCHLIESSLICH anhand der engen {@code portZoneBox}
 * abgeleitet, APPROACHING zusätzlich anhand der {@code approachZone} + Bearing/SOG. Die große
 * AISStream-{@code boundingBox} (reine Empfangs-/Subscription-Box) wird hier NIE verwendet.
 *
 * WICHTIG (AIS-NavigationalStatus, ITU-R M.1371 – korrekte Bedeutung, NICHT "0=Default"!):
 * {@code 0}="under way using engine", {@code 1}="at anchor", {@code 5}="moored",
 * {@code 8}="under way sailing", {@code 15}="undefined" (DAS ist der tatsächliche
 * Default-/Unset-Wert, nicht {@code 0}). {@code 0} ist ein gültiger, aktiv gemeldeter Status.
 *
 * Live-Data-Review zeigte aber real Schiffe im Hafenbecken bei SOG~0 kn mit gemeldetem
 * NavigationalStatus=0 ("underway using engine"), obwohl sie faktisch festgemacht waren – ein
 * bekanntes Datenqualitätsproblem: Besatzungen aktualisieren den NavigationalStatus häufig nicht
 * zeitnah beim Anlegen (manuelles Umschalten, kein automatisches Feld). Bei SOG < 0.5 kn INNERHALB
 * der Port-Zone wird {@code navStatus=0} (ebenso wie ein fehlender oder {@code 15}="undefined"
 * gemeldeter Status) daher bewusst NICHT als zuverlässiges Gegensignal behandelt und MOORED trotzdem
 * heuristisch vergeben ("conflicting AIS data / heuristic fallback" – SOG hat hier Vorrang vor einem
 * NavigationalStatus, der erfahrungsgemäß veraltet sein kann). {@code navStatus=8} ("underway
 * sailing") bleibt dagegen ein echtes Gegensignal (aktiv gemeldeter, selten veralteter Sonderstatus
 * für Segelschiffe) und führt weiterhin zu IN_PORT statt MOORED.
 *
 * WICHTIG: SOG~0 AUSSERHALB der Port-Zone bedeutet für sich genommen NICHT "festgemacht" – das
 * würde z.B. vor der Reede ankernde Schiffe fälschlich als MOORED zeigen. MOORED wird daher nur
 * innerhalb der Port-Zone (Speed-Heuristik) oder unabhängig von der Zone bei eindeutigem
 * NavigationalStatus (AIS-Code 5 = "moored") vergeben.
 *
 * WICHTIG (Live-Data-Review, "MARS"-Fall: navStatus=5 + SOG=4.6 kn): NavigationalStatus=5/1
 * ("moored"/"at anchor") wird von der Besatzung manuell umgeschaltet und kann daher – genau wie
 * navStatus=0 oben – veraltet sein, wenn das Schiff bereits wieder unterwegs ist. INNERHALB der
 * Port-Zone gilt dieses Signal deshalb nur noch als zuverlässig, solange die Geschwindigkeit NICHT
 * deutlich (>= {@code DEPARTING_MIN_SPEED_KN}) über der Moored-Schwelle liegt. Bei klar erkennbarer
 * Fahrt überstimmt SOG/Kurs den (mutmaßlich veralteten) navStatus, und die Ableitung fällt auf die
 * normale Speed-/Bearing-Heuristik zurück (Ergebnis dann DEPARTING oder IN_PORT statt MOORED).
 *
 * Es wird bewusst NUR die (einfache) Peilung Schiff↔Hafenzentrum verwendet, keine Routenprognose,
 * keine Historie/Trajektorie – siehe Klassen-Javadoc von {@link AisStreamClientService}
 * ("keine AIS-Rohmessage-Historie im Speicher").
 */
final class PortStatusCalculator {

    /** Unterhalb dieser Geschwindigkeit (Knoten) gilt ein Schiff in der Port-Zone als "festgemacht/ankernd". */
    private static final double MOORED_SPEED_KN = 0.5;

    /** Unterhalb dieser Geschwindigkeit in der Approach-Zone gilt noch keine erkennbare Anfahrt. */
    private static final double APPROACH_MIN_SPEED_KN = 1.0;

    /** Ab dieser Geschwindigkeit in der Port-Zone gilt eine Bewegung als "Auslaufen" (statt Manöver im Hafen). */
    private static final double DEPARTING_MIN_SPEED_KN = 3.0;

    /** Maximale Abweichung (Grad) zwischen Peilung und Kurs, um "Richtung Hafen"/"Richtung Ausgang" zu erkennen. */
    private static final double BEARING_TOLERANCE_DEG = 60.0;

    /**
     * AIS NavigationalStatus-Codes (ITU-R M.1371) – nur die für die Status-Ableitung relevanten.
     * Korrekte Bedeutung lt. Standard: 0="under way using engine" (GÜLTIGER, aktiv gemeldeter Status,
     * KEIN Default!), 1="at anchor", 5="moored", 8="under way sailing", 15="undefined" (das ist der
     * tatsächliche Default-/Unset-Wert). Siehe Klassen-Javadoc für die Heuristik bei navStatus=0.
     */
    private static final int NAV_STATUS_AT_ANCHOR = 1;
    private static final int NAV_STATUS_MOORED = 5;
    private static final int NAV_STATUS_UNDERWAY_SAILING = 8;

    private PortStatusCalculator() {
    }

    static VesselPortStatus compute(Double latitude, Double longitude, Double speedKn, Double courseDeg,
                                     Integer navStatus, MaritimePort port) {
        if (latitude == null || longitude == null || port == null) {
            return VesselPortStatus.UNKNOWN;
        }
        boolean inPortZone = withinBox(latitude, longitude, port.getPortZoneBox());
        double[] center = port.getCenter();

        if (inPortZone) {
            // Eindeutiges Schiffs-Signal zuerst: "moored"/"at anchor" innerhalb der Port-Zone => MOORED.
            // ABER (Live-Data-Review, "MARS"-Fall: navStatus=5/"moored" bei SOG=4.6 kn): NavigationalStatus
            // wird von der Besatzung manuell umgeschaltet und regelmäßig NICHT zeitnah aktualisiert - ein
            // Schiff kann also bereits wieder unterwegs sein, obwohl noch "moored"/"at anchor" gemeldet wird.
            // Bei DEUTLICHER Fahrt (>= DEPARTING_MIN_SPEED_KN, derselbe Schwellwert wie für die
            // Auslaufen-Erkennung unten) gilt dieses Signal daher als veraltet/unzuverlässig und wird NICHT
            // blind übernommen - stattdessen fällt die Ableitung durch auf die SOG-/Kurs-Heuristik weiter
            // unten (Ergebnis dann i.d.R. DEPARTING oder IN_PORT, je nach Peilung).
            boolean navSaysStationary = navStatus != null && (navStatus == NAV_STATUS_MOORED || navStatus == NAV_STATUS_AT_ANCHOR);
            boolean clearlyMoving = speedKn != null && speedKn >= DEPARTING_MIN_SPEED_KN;
            if (navSaysStationary && !clearlyMoving) {
                return VesselPortStatus.MOORED;
            }
            if (speedKn == null) {
                return VesselPortStatus.IN_PORT;
            }
            if (speedKn < MOORED_SPEED_KN) {
                // Heuristischer Fallback bei widersprüchlichen AIS-Daten (siehe Klassen-Javadoc):
                // NavigationalStatus=0 ("under way using engine") ist laut Standard ein gültiger,
                // aktiv gemeldeter Status - aber in der Praxis häufig veraltet, weil er beim Anlegen
                // nicht manuell umgeschaltet wird. Bei SOG < 0.5 kn innerhalb der Port-Zone wird er
                // (ebenso wie ein fehlender oder "undefined"(15) gemeldeter Status) daher NICHT als
                // zuverlässiges Gegensignal gewertet - SOG hat hier Vorrang. NavigationalStatus=8
                // ("under way sailing") bleibt ein echtes, selten veraltetes Gegensignal.
                boolean explicitlyUnderway = navStatus != null && navStatus == NAV_STATUS_UNDERWAY_SAILING;
                return explicitlyUnderway ? VesselPortStatus.IN_PORT : VesselPortStatus.MOORED;
            }
            if (speedKn >= DEPARTING_MIN_SPEED_KN && courseDeg != null) {
                // Peilung VOM Zentrum ZUM Schiff – bewegt sich das Schiff in diese Richtung, entfernt es sich.
                double bearingFromCenter = bearingDegrees(center[0], center[1], latitude, longitude);
                if (angularDifference(bearingFromCenter, courseDeg) <= BEARING_TOLERANCE_DEG) {
                    return VesselPortStatus.DEPARTING;
                }
            }
            return VesselPortStatus.IN_PORT;
        }

        // Außerhalb der Port-Zone, aber (per Subscription) innerhalb der größeren AISStream-BoundingBox.
        // MOORED nur noch bei eindeutigem AIS-Signal (z.B. Zonen-Box etwas zu eng geschnitten) – SOG~0
        // allein darf hier NIEMALS zu MOORED führen (siehe Klassen-Doku).
        if (navStatus != null && navStatus == NAV_STATUS_MOORED) {
            return VesselPortStatus.MOORED;
        }
        // APPROACHING setzt zusätzlich zu Bearing/SOG voraus, dass sich das Schiff innerhalb der
        // (gegenüber der AISStream-BoundingBox deutlich engeren) Approach-Zone befindet – reiner
        // Durchgangsverkehr weit außerhalb des Hafens mit zufällig passendem Kurs gilt NICHT als
        // "Richtung Hafen" (siehe MaritimePort-Klassendoku "Geometrie-Vereinheitlichung").
        boolean inApproachZone = withinBox(latitude, longitude, port.getApproachZone());
        if (inApproachZone && speedKn != null && speedKn >= APPROACH_MIN_SPEED_KN && courseDeg != null) {
            double bearingToCenter = bearingDegrees(latitude, longitude, center[0], center[1]);
            if (angularDifference(bearingToCenter, courseDeg) <= BEARING_TOLERANCE_DEG) {
                return VesselPortStatus.APPROACHING;
            }
        }
        // Deckt auch "vor Anker außerhalb der Port-Zone" (NavigationalStatus=AT_ANCHOR, SOG~0) sowie
        // Positionen außerhalb der Approach-Zone ab – bewusst NEAR_PORT statt MOORED, siehe Klassen-Doku.
        return VesselPortStatus.NEAR_PORT;
    }

    private static boolean withinBox(double lat, double lon, double[][] box) {
        double minLat = Math.min(box[0][0], box[1][0]);
        double maxLat = Math.max(box[0][0], box[1][0]);
        double minLon = Math.min(box[0][1], box[1][1]);
        double maxLon = Math.max(box[0][1], box[1][1]);
        return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
    }

    /** Peilung (0-360°) vom Punkt 1 zum Punkt 2, Standard-Großkreis-Formel. */
    private static double bearingDegrees(double lat1, double lon1, double lat2, double lon2) {
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaLambda = Math.toRadians(lon2 - lon1);
        double y = Math.sin(deltaLambda) * Math.cos(phi2);
        double x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
        double theta = Math.atan2(y, x);
        return (Math.toDegrees(theta) + 360) % 360;
    }

    /** Kleinster Winkel-Unterschied (0-180°) zwischen zwei Peilungen/Kursen. */
    private static double angularDifference(double a, double b) {
        double diff = Math.abs(a - b) % 360;
        return diff > 180 ? 360 - diff : diff;
    }
}


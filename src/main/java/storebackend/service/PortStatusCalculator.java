package storebackend.service;

import storebackend.enums.MaritimePort;
import storebackend.enums.VesselPortStatus;

/**
 * Leitet einen einfachen, nachvollziehbaren operativen Status ({@link VesselPortStatus}) für ein
 * Schiff ab – Phase 2A des Maritime-Features ("Port Operations").
 *
 * MVP-Regeln (bewusst einfach gehalten, siehe Aufgabenstellung):
 *  - Position INNERHALB der Port-Zone + AIS-NavigationalStatus meldet explizit "moored"/"at anchor" => MOORED
 *  - Position INNERHALB der Port-Zone + sehr niedrige Geschwindigkeit (und NavigationalStatus
 *    widerspricht nicht "underway")                                                            => MOORED
 *  - Position INNERHALB der Port-Zone + höhere Geschwindigkeit, Kurs vom Zentrum WEG            => DEPARTING
 *  - Position INNERHALB der Port-Zone, sonst (langsam bewegend/manövrierend)                    => IN_PORT
 *  - Position AUSSERHALB der Port-Zone, AIS-NavigationalStatus meldet explizit "moored"          => MOORED
 *    (eindeutiges Schiffs-Signal überstimmt die – notwendigerweise grobe – Zonen-Box)
 *  - Position AUSSERHALB der Port-Zone, Kurs zum Zentrum HIN                                    => APPROACHING
 *  - Position AUSSERHALB der Port-Zone, sonst (auch SOG~0, z.B. vor Anker liegend)               => NEAR_PORT
 *  - Fehlende Position                                                                          => UNKNOWN
 *
 * WICHTIG: SOG~0 AUSSERHALB der Port-Zone bedeutet für sich genommen NICHT "festgemacht" – das
 * würde z.B. vor der Reede ankernde Schiffe fälschlich als MOORED zeigen. MOORED wird daher nur
 * innerhalb der Port-Zone (Speed-Heuristik) oder unabhängig von der Zone bei eindeutigem
 * NavigationalStatus (AIS-Code 5 = "moored") vergeben.
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

    /** AIS NavigationalStatus-Codes (ITU-R M.1371) – nur die für die Status-Ableitung relevanten. */
    private static final int NAV_STATUS_UNDERWAY_ENGINE = 0;
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
            if (navStatus != null && (navStatus == NAV_STATUS_MOORED || navStatus == NAV_STATUS_AT_ANCHOR)) {
                return VesselPortStatus.MOORED;
            }
            if (speedKn == null) {
                return VesselPortStatus.IN_PORT;
            }
            if (speedKn < MOORED_SPEED_KN) {
                // Widerspricht der NavigationalStatus explizit "underway" (Maschine/Segel), dann eher
                // ein kurzer Stopp/Manöver als "festgemacht" – konservativ IN_PORT statt MOORED.
                boolean explicitlyUnderway = navStatus != null
                        && (navStatus == NAV_STATUS_UNDERWAY_ENGINE || navStatus == NAV_STATUS_UNDERWAY_SAILING);
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
        if (speedKn != null && speedKn >= APPROACH_MIN_SPEED_KN && courseDeg != null) {
            double bearingToCenter = bearingDegrees(latitude, longitude, center[0], center[1]);
            if (angularDifference(bearingToCenter, courseDeg) <= BEARING_TOLERANCE_DEG) {
                return VesselPortStatus.APPROACHING;
            }
        }
        // Deckt auch "vor Anker außerhalb der Port-Zone" (NavigationalStatus=AT_ANCHOR, SOG~0) ab –
        // bewusst NEAR_PORT statt MOORED, siehe Klassen-Doku.
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


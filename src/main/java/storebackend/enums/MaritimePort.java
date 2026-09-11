package storebackend.enums;

/**
 * Unterstützte Häfen für das Maritime-Feature (Live-AIS via AISStream).
 *
 * Jeder Hafen hat eine eigene BoundingBox, die als AISStream-Subscription verwendet wird.
 * Der Wechsel zwischen Häfen läuft über {@code AisStreamClientService#switchPort(MaritimePort)}
 * und aktualisiert die Subscription auf der EINEN bestehenden WebSocket-Verbindung – es wird
 * NIE eine zusätzliche/parallele AISStream-Verbindung aufgebaut.
 *
 * Format der BoundingBox exakt wie vom AISStream-Payload erwartet:
 * {@code [[lat1, lon1], [lat2, lon2]]} (Eckpunkte, Reihenfolge für AISStream selbst nicht relevant).
 *
 * Phase 2A (Port Operations): zusätzlich zur AISStream-BoundingBox ("Approach"-Bereich)
 * hat jeder Hafen eine kleinere interne {@link #portZoneBox} ("PORT"-Zone, z.B. Hafenbecken)
 * und einen {@link #center} Punkt. Beides wird NUR für die eigene Business-Logik
 * (Port-Status-Ableitung, siehe {@code storebackend.service.PortStatusCalculator}) verwendet –
 * AISStream selbst bekommt weiterhin ausschließlich die größere {@link #boundingBox}.
 *
 * Live-Data-Review (nach erstem Produktiv-Deploy): Tanger Meds ursprüngliche {@link #portZoneBox}
 * ({@code [[35.85,-5.55],[35.95,-5.30]]}, ca. 11km x 22.5km) reichte weit in die allgemeine
 * Verkehrstrennungszone der Straße von Gibraltar hinein. Schiffe, die dort mit 6-9 kn durchfuhren
 * (kein Anlauf/Ablauf-Kurs relativ zum Hafenzentrum, siehe PortStatusCalculator-Bearing-Check),
 * fielen mangels engerer Geometrie in den IN_PORT-Default-Fall. Die Zone wurde auf das eigentliche
 * Hafenbecken inkl. unmittelbarer Zufahrt verkleinert (ca. 5.5km x 6.3km). Die AISStream-
 * {@link #boundingBox} bleibt unverändert groß (reine Empfangs-/Subscription-Box).
 *
 * TEMPORÄR (Deployment-Diagnose, vor Phase-2A-Livetest): NADOR und CASABLANCA verwenden bewusst
 * größere Test-BoundingBoxes als eigentlich für den Hafen nötig, um zunächst zu verifizieren, dass
 * AISStream in diesen Regionen überhaupt PositionReports liefert (Tanger Med lieferte bereits Daten,
 * Nador/Casablanca bisher nicht). Die kleinere interne {@link #portZoneBox} (Statuslogik) bleibt davon
 * unberührt. Sobald AISStream-Abdeckung bestätigt ist, können die BoundingBoxes wieder auf die engeren,
 * ursprünglich spezifizierten Werte ({@code NADOR: [[35.15,-3.05],[35.38,-2.75]]},
 * {@code CASABLANCA: [[33.48,-7.78],[33.72,-7.42]]}) zurückgesetzt werden.
 */
public enum MaritimePort {

    TANGER_MED("Tanger Med",
            new double[][]{{35.75, -5.65}, {36.05, -5.20}},
            new double[][]{{35.865, -5.535}, {35.915, -5.465}},
            new double[]{35.89, -5.41}),
    // TEMPORÄR: Test-Box lt. Vorgabe (größer als [[35.15,-3.05],[35.38,-2.75]]), um AISStream-Abdeckung zu prüfen.
    NADOR("Nador",
            new double[][]{{35.6, -3.4}, {34.9, -2.4}},
            new double[][]{{35.22, -2.98}, {35.30, -2.87}},
            new double[]{35.263, -2.924}),
    // TEMPORÄR: Test-Box lt. Vorgabe (größer als [[33.48,-7.78],[33.72,-7.42]]), um AISStream-Abdeckung zu prüfen.
    CASABLANCA("Casablanca",
            new double[][]{{34.0, -8.2}, {33.2, -7.0}},
            new double[][]{{33.57, -7.65}, {33.63, -7.57}},
            new double[]{33.60, -7.61});

    private final String displayName;
    private final double[][] boundingBox;
    private final double[][] portZoneBox;
    private final double[] center;

    MaritimePort(String displayName, double[][] boundingBox, double[][] portZoneBox, double[] center) {
        this.displayName = displayName;
        this.boundingBox = boundingBox;
        this.portZoneBox = portZoneBox;
        this.center = center;
    }

    public String getDisplayName() {
        return displayName;
    }

    public double[][] getBoundingBox() {
        return boundingBox;
    }

    /** Kleinere interne Zone (z.B. Hafenbecken) für die Port-Status-Ableitung – NICHT an AISStream gesendet. */
    public double[][] getPortZoneBox() {
        return portZoneBox;
    }

    /** Hafenzentrum {lat, lon} – Referenzpunkt für die Richtungserkennung (An-/Abfahrt). */
    public double[] getCenter() {
        return center;
    }

    /** Defensiv: liefert null statt Exception bei unbekannter/ungültiger Port-ID (z. B. aus REST-Request). */
    public static MaritimePort fromId(String id) {
        if (id == null) {
            return null;
        }
        for (MaritimePort port : values()) {
            if (port.name().equalsIgnoreCase(id.trim())) {
                return port;
            }
        }
        return null;
    }
}

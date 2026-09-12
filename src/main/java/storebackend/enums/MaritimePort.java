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
 * Es gibt DREI unabhängige Geometrien pro Hafen, bewusst getrennt und NIE untereinander vertauscht:
 *  - {@link #boundingBox}: NUR die AISStream-Empfangs-/Subscription-Box (Format: min-Ecke, max-Ecke,
 *    d.h. {@code {{minLat,minLon},{maxLat,maxLon}}} – siehe Ausnahme unten für Nador/Casablanca-Testboxen).
 *    Darf groß bleiben, wird von {@code PortStatusCalculator} NIEMALS für die Status-Ableitung verwendet.
 *  - {@link #portZoneBox}: enge interne "PORT"-Zone (Hafenbecken) – einzige Grundlage für IN_PORT/MOORED/
 *    DEPARTING (siehe {@code storebackend.service.PortStatusCalculator}).
 *  - {@link #approachZone}: mittelgroße interne Zone um den Hafen herum (umschließt die {@link #portZoneBox})
 *    – Voraussetzung dafür, dass ein Schiff außerhalb der Port-Zone überhaupt als APPROACHING gilt
 *    (zusätzlich zu Bearing/COG + Mindest-SOG). Schiffe außerhalb dieser Zone (z.B. reiner Durchgangsverkehr
 *    in der Straße von Gibraltar) werden nicht als "Richtung Hafen" gewertet, selbst bei passendem Kurs.
 * Alle drei Geometrien nutzen intern konsistent das Format {@code {{minLat,minLon},{maxLat,maxLon}}}.
 *
 * Live-Data-Review (nach erstem Produktiv-Deploy): Tanger Meds ursprüngliche {@link #portZoneBox}
 * ({@code [[35.85,-5.55],[35.95,-5.30]]}, ca. 11km x 22.5km) reichte weit in die allgemeine
 * Verkehrstrennungszone der Straße von Gibraltar hinein. Schiffe, die dort mit 6-9 kn durchfuhren
 * (kein Anlauf/Ablauf-Kurs relativ zum Hafenzentrum, siehe PortStatusCalculator-Bearing-Check),
 * fielen mangels engerer Geometrie in den IN_PORT-Default-Fall. Die Zone wurde auf das eigentliche
 * Hafenbecken inkl. unmittelbarer Zufahrt verkleinert (ca. 5.5km x 6.3km). Die AISStream-
 * {@link #boundingBox} bleibt unverändert groß (reine Empfangs-/Subscription-Box).
 *
 * Geometrie-Vereinheitlichung (verifizierte Referenzpunkte): {@link #center} wurde für Tanger Med von
 * {@code -5.41} auf {@code -5.4945} korrigiert – der alte Wert lag außerhalb der {@link #portZoneBox}
 * (ca. 9km östlich) und hätte Peilungen für An-/Abfahrterkennung verfälscht. {@link #approachZone} wurde
 * für alle drei Häfen neu eingeführt (vorher gab es für "APPROACHING" keine eigene Geometrie, nur
 * Bearing/SOG relativ zum Zentrum – dadurch konnte theoretisch auch weit entfernter Durchgangsverkehr
 * mit zufällig passendem Kurs als APPROACHING gelten).
 *
 * TEMPORÄR (Deployment-Diagnose, AIS-Empfangsproblem-Untersuchung NADOR/CASABLANCA):
 * NADOR und CASABLANCA verwenden bewusst noch größere Diagnose-BoundingBoxes als der vorherige
 * Test-Stand, um auszuschließen, dass eine zu enge AIS-Empfangsbox (statt fehlender AISStream-
 * Abdeckung) die Ursache für vesselCount=0 ist. NUR die AISStream-Subscription-BoundingBox wurde
 * vergrößert - {@link #portZoneBox}, {@link #approachZone} und {@link #center} (Status-Ableitung,
 * siehe PortStatusCalculator) bleiben UNVERÄNDERT. Referenzpunkt NADOR: "GOLDEN BRIDGE"
 * (MMSI 209410000) real bei 35.27228 N / 2.92535 W beobachtet - liegt innerhalb dieser Box UND
 * bereits innerhalb der bestehenden {@link #portZoneBox} (siehe PortStatusCalculatorTest).
 * Sobald AISStream-Abdeckung für beide Häfen bestätigt ist, können die BoundingBoxes wieder auf
 * die engeren, ursprünglich spezifizierten Werte
 * ({@code NADOR: [[35.15,-3.05],[35.38,-2.75]]}, {@code CASABLANCA: [[33.48,-7.78],[33.72,-7.42]]})
 * zurückgesetzt werden.
 */
public enum MaritimePort {

    TANGER_MED("Tanger Med",
            new double[][]{{35.75, -5.65}, {36.05, -5.20}},
            new double[][]{{35.865, -5.535}, {35.915, -5.465}},
            new double[][]{{35.82, -5.60}, {35.97, -5.39}},
            new double[]{35.895, -5.4945}),
    // TEMPORÄR (Diagnose-Box #2, siehe Klassen-Javadoc): lat 34.8-36.0, lon -4.0..-1.5.
    NADOR("Nador",
            new double[][]{{34.8, -4.0}, {36.0, -1.5}},
            new double[][]{{35.22, -2.98}, {35.30, -2.87}},
            new double[][]{{35.14, -3.09}, {35.38, -2.76}},
            new double[]{35.26, -2.92}),
    // TEMPORÄR (Diagnose-Box #2, siehe Klassen-Javadoc): lat 32.9-34.3, lon -8.5..-6.5.
    CASABLANCA("Casablanca",
            new double[][]{{32.9, -8.5}, {34.3, -6.5}},
            new double[][]{{33.57, -7.67}, {33.64, -7.56}},
            new double[][]{{33.50, -7.80}, {33.70, -7.45}},
            new double[]{33.6014, -7.6145});

    private final String displayName;
    private final double[][] boundingBox;
    private final double[][] portZoneBox;
    private final double[][] approachZone;
    private final double[] center;

    MaritimePort(String displayName, double[][] boundingBox, double[][] portZoneBox,
                 double[][] approachZone, double[] center) {
        this.displayName = displayName;
        this.boundingBox = boundingBox;
        this.portZoneBox = portZoneBox;
        this.approachZone = approachZone;
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

    /**
     * Mittelgroße interne Zone um den Hafen (umschließt {@link #portZoneBox}) – Voraussetzung für
     * APPROACHING außerhalb der Port-Zone (zusätzlich zu Bearing/SOG). NICHT an AISStream gesendet,
     * unabhängig von {@link #boundingBox}.
     */
    public double[][] getApproachZone() {
        return approachZone;
    }

    /** Hafenzentrum {lat, lon} – Referenzpunkt für die Richtungserkennung (An-/Abfahrt). */
    public double[] getCenter() {
        return center;
    }

    /**
     * Diagnose-Hilfsmethode (AIS-Empfangsproblem-Untersuchung NADOR/CASABLANCA): prüft, ob ein
     * Punkt innerhalb der AISStream-{@link #boundingBox} liegt (also grundsätzlich empfangen werden
     * SOLLTE, unabhängig von portZoneBox/approachZone/PortStatusCalculator). Bewusst als eigene,
     * kleine Methode statt Wiederverwendung von PortStatusCalculator (dessen withinBox privat und
     * für die enge Port-Zone gedacht ist) - hier geht es nur um die große Empfangsbox.
     */
    public boolean isWithinBoundingBox(double lat, double lon) {
        return withinBox(lat, lon, boundingBox);
    }

    private static boolean withinBox(double lat, double lon, double[][] box) {
        double minLat = Math.min(box[0][0], box[1][0]);
        double maxLat = Math.max(box[0][0], box[1][0]);
        double minLon = Math.min(box[0][1], box[1][1]);
        double maxLon = Math.max(box[0][1], box[1][1]);
        return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
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

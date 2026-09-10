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
 * {@code [[minLat, minLon], [maxLat, maxLon]]}.
 */
public enum MaritimePort {

    TANGER_MED("Tanger Med", new double[][]{
            {35.75, -5.65},
            {36.05, -5.20}
    }),
    NADOR("Nador", new double[][]{
            {35.15, -3.05},
            {35.38, -2.75}
    }),
    CASABLANCA("Casablanca", new double[][]{
            {33.48, -7.78},
            {33.72, -7.42}
    });

    private final String displayName;
    private final double[][] boundingBox;

    MaritimePort(String displayName, double[][] boundingBox) {
        this.displayName = displayName;
        this.boundingBox = boundingBox;
    }

    public String getDisplayName() {
        return displayName;
    }

    public double[][] getBoundingBox() {
        return boundingBox;
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

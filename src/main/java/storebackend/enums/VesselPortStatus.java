package storebackend.enums;

/**
 * Einfacher, nachvollziehbarer operativer Status eines Schiffs relativ zum aktuell
 * ausgewählten Hafen ({@link MaritimePort}) – Phase 2A des Maritime-Features.
 *
 * Bewusst KEINE komplexe Trajektorien-/Routenanalyse – nur Position + Geschwindigkeit
 * (SOG) + Kurs (COG) relativ zur Hafen-Zone, siehe {@code storebackend.service.PortStatusCalculator}.
 */
public enum VesselPortStatus {
    /** Außerhalb der Port-Zone, Kurs zeigt erkennbar Richtung Hafenzentrum. */
    APPROACHING,
    /** Innerhalb der Port-Zone, in Bewegung (kein Ankern/Festmachen erkennbar). */
    IN_PORT,
    /** Innerhalb der Port-Zone, sehr niedrige Geschwindigkeit (liegt/ankert vermutlich). */
    MOORED,
    /** Innerhalb der Port-Zone, Geschwindigkeit steigt und Kurs zeigt vom Zentrum weg. */
    DEPARTING,
    /** Außerhalb der Port-Zone (aber innerhalb der AISStream-BoundingBox), keine klare An-/Abfahrt erkennbar. */
    NEAR_PORT,
    /** Position/Geschwindigkeit/Kurs nicht ausreichend, um einen Status abzuleiten. */
    UNKNOWN
}

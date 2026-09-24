package storebackend.enums;

/**
 * Fachlicher Statuswechsel eines Schiffs relativ zu einem Hafen ({@link MaritimePort}) –
 * Phase 2B des Maritime-Features ("Port Events" / kleine Historie).
 *
 * WICHTIG: Es wird NICHT jede AIS-Nachricht persistiert, sondern nur ein Event, wenn sich der
 * abgeleitete {@link VesselPortStatus} eines Schiffs tatsächlich ändert (siehe
 * {@code storebackend.service.VesselPortEventService#recordTransitionIfAny}).
 */
public enum PortEventType {
    /** NEAR_PORT/UNKNOWN -> APPROACHING (Kurs erkennbar Richtung Hafen). */
    APPROACHING,
    /** APPROACHING/NEAR_PORT/UNKNOWN -> IN_PORT (Port-Zone erreicht). */
    ENTERED_PORT,
    /** Beliebiger Statuswechsel -> MOORED (festgemacht/ankernd). */
    MOORED,
    /** MOORED/IN_PORT -> DEPARTING (Auslaufen erkannt, noch in der Port-Zone). */
    DEPARTING,
    /** MOORED/IN_PORT/DEPARTING -> außerhalb der Port-Zone (NEAR_PORT/APPROACHING/UNKNOWN). */
    LEFT_PORT
}

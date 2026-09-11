package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.enums.MaritimePort;
import storebackend.enums.VesselPortStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tests für {@link PortStatusCalculator} – insbesondere die Geometrie-Vereinheitlichung
 * (portZoneBox/approachZone getrennt von der AISStream-BoundingBox, siehe MaritimePort-Klassendoku).
 *
 * Nutzt TANGER_MED als Referenzhafen (center=35.895,-5.4945; portZoneBox=[[35.865,-5.535],
 * [35.915,-5.465]]; approachZone=[[35.82,-5.60],[35.97,-5.39]]).
 */
class PortStatusCalculatorTest {

    private static final MaritimePort PORT = MaritimePort.TANGER_MED;

    @Test
    void withinPortZone_explicitMooredNavStatus_returnsMoored() {
        VesselPortStatus status = PortStatusCalculator.compute(35.89, -5.50, 5.0, 90.0, 5, PORT);
        assertEquals(VesselPortStatus.MOORED, status);
    }

    @Test
    void withinPortZone_lowSpeed_returnsMoored() {
        VesselPortStatus status = PortStatusCalculator.compute(35.89, -5.50, 0.1, null, null, PORT);
        assertEquals(VesselPortStatus.MOORED, status);
    }

    @Test
    void withinPortZone_moderateSpeedNoDepartBearing_returnsInPort() {
        VesselPortStatus status = PortStatusCalculator.compute(35.89, -5.50, 2.0, null, null, PORT);
        assertEquals(VesselPortStatus.IN_PORT, status);
    }

    @Test
    void withinPortZone_highSpeedAwayFromCenter_returnsDeparting() {
        // Vessel due north of center, moving further north (course=0 == bearing from center) => DEPARTING.
        VesselPortStatus status = PortStatusCalculator.compute(35.91, -5.4945, 5.0, 0.0, null, PORT);
        assertEquals(VesselPortStatus.DEPARTING, status);
    }

    @Test
    void withinApproachZone_courseTowardCenter_returnsApproaching() {
        // Vessel due south of center, within approachZone but outside portZoneBox, heading north (toward center).
        VesselPortStatus status = PortStatusCalculator.compute(35.85, -5.4945, 5.0, 0.0, null, PORT);
        assertEquals(VesselPortStatus.APPROACHING, status);
    }

    @Test
    void outsideApproachZone_evenWithMatchingCourse_returnsNearPortNotApproaching() {
        // Regression test for the geometry fix: a vessel far south of the port (outside BOTH
        // portZoneBox AND approachZone, e.g. general strait transit traffic) heading exactly toward
        // the port center must NOT be classified as APPROACHING anymore - it is simply too far away
        // to be meaningfully "approaching" the port (see MaritimePort-Klassendoku "Geometrie-Vereinheitlichung").
        VesselPortStatus status = PortStatusCalculator.compute(35.70, -5.4945, 8.0, 0.0, null, PORT);
        assertEquals(VesselPortStatus.NEAR_PORT, status);
    }

    @Test
    void outsidePortZone_explicitMooredNavStatus_returnsMooredRegardlessOfZone() {
        // Explicit AIS signal overrides zone geometry entirely (unchanged behavior).
        VesselPortStatus status = PortStatusCalculator.compute(35.70, -5.4945, 0.2, null, 5, PORT);
        assertEquals(VesselPortStatus.MOORED, status);
    }

    @Test
    void missingPosition_returnsUnknown() {
        VesselPortStatus status = PortStatusCalculator.compute(null, null, null, null, null, PORT);
        assertEquals(VesselPortStatus.UNKNOWN, status);
    }
}

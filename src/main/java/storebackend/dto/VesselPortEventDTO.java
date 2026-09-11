package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

/**
 * Ein einzelnes Port Event (Phase 2B), siehe {@link storebackend.entity.VesselPortEvent}.
 */
@Getter
@Setter
@Builder
@AllArgsConstructor
public class VesselPortEventDTO {
    private long mmsi;
    private String port;
    /** {@link storebackend.enums.PortEventType} als String (z.B. "ENTERED_PORT"). */
    private String eventType;
    private Instant eventTime;
    private Double latitude;
    private Double longitude;
    private Double sog;
    private String shipName;
    private String destination;
}

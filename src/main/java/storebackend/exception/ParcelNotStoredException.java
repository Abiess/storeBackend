package storebackend.exception;

import lombok.Getter;

import java.util.Map;

/**
 * Exception: Paket ist nicht STORED
 * 
 * Phase 3A.4 - Paket-Korrektur
 * 
 * Wird geworfen wenn versucht wird, ein Paket zu stornieren,
 * das nicht mehr STORED ist (z.B. bereits PICKED_UP oder CANCELLED)
 */
@Getter
public class ParcelNotStoredException extends DhlParcelException {
    
    public ParcelNotStoredException(String trackingCode, String currentStatus) {
        super(
            "PARCEL_NOT_STORED",
            String.format("Parcel %s cannot be cancelled - current status: %s", trackingCode, currentStatus),
            Map.of(
                "trackingCode", trackingCode,
                "currentStatus", currentStatus
            )
        );
    }
}

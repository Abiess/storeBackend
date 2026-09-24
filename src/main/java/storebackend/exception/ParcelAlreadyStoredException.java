package storebackend.exception;

import java.time.LocalDateTime;

/**
 * Exception thrown when attempting to store a parcel that is already stored.
 * HTTP Status: 409 Conflict
 */
public class ParcelAlreadyStoredException extends DhlParcelException {
    
    public ParcelAlreadyStoredException(String trackingCode, String slot, LocalDateTime storedAt) {
        super("PARCEL_ALREADY_STORED", "This parcel is already stored");
        withDetail("trackingCode", trackingCode);
        if (slot != null) {
            withDetail("slot", slot);
        }
        if (storedAt != null) {
            withDetail("storedAt", storedAt.toString());
        }
    }
}

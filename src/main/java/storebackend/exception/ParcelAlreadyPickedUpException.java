package storebackend.exception;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Exception thrown when attempting to pick up a parcel that has already been picked up.
 * HTTP Status: 409 Conflict
 */
public class ParcelAlreadyPickedUpException extends DhlParcelException {
    
    public ParcelAlreadyPickedUpException(String trackingCode, String slot, LocalDateTime pickedUpAt) {
        super("PARCEL_ALREADY_PICKED_UP", "This parcel has already been picked up");
        withDetail("trackingCode", trackingCode);
        if (slot != null) {
            withDetail("slot", slot);
        }
        if (pickedUpAt != null) {
            withDetail("pickedUpAt", pickedUpAt.toString());
        }
    }
}

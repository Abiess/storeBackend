package storebackend.exception;

/**
 * Exception thrown when a parcel cannot be found.
 * HTTP Status: 404 Not Found
 */
public class ParcelNotFoundException extends DhlParcelException {
    
    public ParcelNotFoundException(String trackingCode) {
        super("PARCEL_NOT_FOUND", "Parcel not found");
        withDetail("trackingCode", trackingCode);
    }
}

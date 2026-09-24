package storebackend.exception;

/**
 * Exception thrown when a tracking code is invalid or cannot be normalized.
 * HTTP Status: 400 Bad Request
 */
public class InvalidTrackingCodeException extends DhlParcelException {
    
    public InvalidTrackingCodeException(String rawCode, String reason) {
        super("INVALID_TRACKING_CODE", "Invalid tracking code: " + reason);
        withDetail("rawCode", rawCode);
        withDetail("reason", reason);
    }
}

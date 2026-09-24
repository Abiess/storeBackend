package storebackend.exception;

/**
 * Exception für E-Mail-Versandfehler (SMTP-Limit, Netzwerkfehler, etc.)
 * Sollte als HTTP 503 Service Unavailable behandelt werden, nicht als 500 Internal Server Error.
 */
public class EmailDeliveryException extends RuntimeException {
    public EmailDeliveryException(String message) {
        super(message);
    }

    public EmailDeliveryException(String message, Throwable cause) {
        super(message, cause);
    }
}

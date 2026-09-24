package storebackend.exception;

/**
 * Exception wenn kein freier Lagerplatz verfügbar ist
 */
public class NoFreeSlotException extends RuntimeException {
    public NoFreeSlotException(String message) {
        super(message);
    }
    
    public NoFreeSlotException(Long storeId) {
        super("No free shelf slot available for store: " + storeId);
    }
}

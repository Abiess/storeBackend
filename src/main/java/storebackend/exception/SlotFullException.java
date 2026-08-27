package storebackend.exception;

/**
 * Exception thrown when attempting to use a slot that has reached capacity.
 * HTTP Status: 409 Conflict
 */
public class SlotFullException extends DhlParcelException {
    
    public SlotFullException(String slotCode, int capacity, int occupied) {
        super("SLOT_FULL", "The selected slot is full");
        withDetail("slotCode", slotCode);
        withDetail("capacity", capacity);
        withDetail("occupied", occupied);
    }
}

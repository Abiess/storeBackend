package storebackend.exception;

import lombok.Getter;

import java.util.HashMap;
import java.util.Map;

/**
 * DHL Slot Exception (Phase 3A.5)
 * 
 * Strukturierte Exceptions für Fachverwaltung
 * 
 * Error Codes:
 * - SLOT_CODE_ALREADY_EXISTS
 * - INVALID_SLOT_CAPACITY
 * - INVALID_BATCH_COUNT
 * - CAPACITY_BELOW_OCCUPIED
 * - CANNOT_DEACTIVATE_OCCUPIED_SLOT
 * - SLOT_NOT_FOUND
 */
@Getter
public class DhlSlotException extends RuntimeException {
    
    private final String code;
    private final Map<String, Object> details;
    
    public DhlSlotException(String code) {
        this(code, null, new HashMap<>());
    }
    
    public DhlSlotException(String code, String message) {
        this(code, message, new HashMap<>());
    }
    
    public DhlSlotException(String code, Map<String, Object> details) {
        this(code, null, details);
    }
    
    public DhlSlotException(String code, String message, Map<String, Object> details) {
        super(message != null ? message : code);
        this.code = code;
        this.details = details != null ? details : new HashMap<>();
    }
}

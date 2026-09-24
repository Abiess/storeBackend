package storebackend.exception;

import lombok.Getter;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Base exception for DHL parcel operations.
 * Provides structured error responses with error codes and details.
 */
@Getter
public class DhlParcelException extends RuntimeException {
    
    private final String code;
    private final Map<String, Object> details;
    
    public DhlParcelException(String code, String message) {
        super(message);
        this.code = code;
        this.details = new HashMap<>();
    }
    
    public DhlParcelException(String code, String message, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.details = details != null ? details : new HashMap<>();
    }
    
    public DhlParcelException withDetail(String key, Object value) {
        this.details.put(key, value);
        return this;
    }
    
    public Map<String, Object> toErrorResponse(int status) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("status", status);
        response.put("code", code);
        response.put("message", getMessage());
        if (!details.isEmpty()) {
            response.put("details", details);
        }
        return response;
    }
}

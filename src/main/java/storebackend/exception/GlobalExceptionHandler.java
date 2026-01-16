package storebackend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Globaler Exception Handler für die Anwendung
 *
 * Behandelt NoResourceFoundException und gibt HTTP 404 statt 500 zurück
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Behandelt NoResourceFoundException (wenn kein Handler gefunden wird)
     *
     * Grund: Spring behandelt fehlende Controller-Mappings als "statische Ressource nicht gefunden"
     * und wirft NoResourceFoundException, was standardmäßig zu HTTP 500 führt.
     *
     * Diese Methode fängt die Exception ab und gibt stattdessen HTTP 404 zurück.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(NoResourceFoundException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.NOT_FOUND.value());
        errorResponse.put("error", "Not Found");
        errorResponse.put("message", "The requested endpoint does not exist: " + ex.getResourcePath());
        errorResponse.put("path", ex.getResourcePath());

        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(errorResponse);
    }

    /**
     * Allgemeiner Exception Handler als Fallback
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(Exception ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorResponse.put("error", "Internal Server Error");
        errorResponse.put("message", ex.getMessage());

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse);
    }
}


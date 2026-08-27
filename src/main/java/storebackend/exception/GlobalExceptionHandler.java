package storebackend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Globaler Exception Handler für die Anwendung.
 *
 * WICHTIG: Reihenfolge der @ExceptionHandler-Methoden ist relevant –
 * spezifischere Handler müssen VOR dem generischen Exception.class-Handler kommen.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    // ════════════════════════════════════════════════════════════════════════
    // DHL-SPEZIFISCHE EXCEPTIONS (Phase 3A.3)
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Behandelt ParcelAlreadyPickedUpException → HTTP 409 Conflict.
     */
    @ExceptionHandler(ParcelAlreadyPickedUpException.class)
    public ResponseEntity<Map<String, Object>> handleParcelAlreadyPickedUp(ParcelAlreadyPickedUpException ex) {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ex.toErrorResponse(HttpStatus.CONFLICT.value()));
    }

    /**
     * Behandelt ParcelAlreadyStoredException → HTTP 409 Conflict.
     */
    @ExceptionHandler(ParcelAlreadyStoredException.class)
    public ResponseEntity<Map<String, Object>> handleParcelAlreadyStored(ParcelAlreadyStoredException ex) {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ex.toErrorResponse(HttpStatus.CONFLICT.value()));
    }

    /**
     * Behandelt ParcelNotFoundException → HTTP 404 Not Found.
     */
    @ExceptionHandler(ParcelNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleParcelNotFound(ParcelNotFoundException ex) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(ex.toErrorResponse(HttpStatus.NOT_FOUND.value()));
    }

    /**
     * Behandelt SlotFullException → HTTP 409 Conflict.
     */
    @ExceptionHandler(SlotFullException.class)
    public ResponseEntity<Map<String, Object>> handleSlotFull(SlotFullException ex) {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ex.toErrorResponse(HttpStatus.CONFLICT.value()));
    }

    /**
     * Behandelt InvalidTrackingCodeException → HTTP 400 Bad Request.
     */
    @ExceptionHandler(InvalidTrackingCodeException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidTrackingCode(InvalidTrackingCodeException ex) {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(ex.toErrorResponse(HttpStatus.BAD_REQUEST.value()));
    }

    /**
     * Behandelt NoFreeSlotException → HTTP 409 Conflict.
     */
    @ExceptionHandler(NoFreeSlotException.class)
    public ResponseEntity<Map<String, Object>> handleNoFreeSlot(NoFreeSlotException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.CONFLICT.value());
        errorResponse.put("code", "NO_FREE_SLOT");
        errorResponse.put("message", ex.getMessage());

        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(errorResponse);
    }
    
    /**
     * Phase 3A.4 - Paket-Korrektur Exceptions
     */
    
    @ExceptionHandler(ParcelNotStoredException.class)
    public ResponseEntity<Map<String, Object>> handleParcelNotStored(ParcelNotStoredException ex) {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ex.toErrorResponse(HttpStatus.CONFLICT.value()));
    }
    
    @ExceptionHandler(ParcelAlreadyCancelledException.class)
    public ResponseEntity<Map<String, Object>> handleParcelAlreadyCancelled(ParcelAlreadyCancelledException ex) {
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(ex.toErrorResponse(HttpStatus.CONFLICT.value()));
    }
    
    /**
     * Phase 3A.5 - Fachverwaltung Exceptions
     */
    
    @ExceptionHandler(DhlSlotException.class)
    public ResponseEntity<Map<String, Object>> handleDhlSlotException(DhlSlotException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        
        // Map error codes to HTTP status codes
        HttpStatus status;
        switch (ex.getCode()) {
            case "SLOT_CODE_ALREADY_EXISTS":
            case "CAPACITY_BELOW_OCCUPIED":
            case "CANNOT_DEACTIVATE_OCCUPIED_SLOT":
                status = HttpStatus.CONFLICT;
                break;
            case "SLOT_NOT_FOUND":
                status = HttpStatus.NOT_FOUND;
                break;
            case "INVALID_SLOT_CAPACITY":
            case "INVALID_BATCH_COUNT":
                status = HttpStatus.BAD_REQUEST;
                break;
            default:
                status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        
        errorResponse.put("status", status.value());
        errorResponse.put("code", ex.getCode());
        errorResponse.put("message", ex.getMessage());
        errorResponse.put("details", ex.getDetails());
        
        return ResponseEntity
            .status(status)
            .body(errorResponse);
    }

    // ════════════════════════════════════════════════════════════════════════
    // SECURITY EXCEPTIONS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Behandelt AccessDeniedException (403 Forbidden) – z.B. durch @PreAuthorize.
     * MUSS vor handleGeneralException stehen!
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(AccessDeniedException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.FORBIDDEN.value());
        errorResponse.put("error", "Forbidden");
        errorResponse.put("code", "FORBIDDEN");
        errorResponse.put("message", "Zugriff verweigert: " + ex.getMessage());

        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(errorResponse);
    }

    /**
     * Behandelt AuthenticationException (401 Unauthorized).
     * MUSS vor handleGeneralException stehen!
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(AuthenticationException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.UNAUTHORIZED.value());
        errorResponse.put("error", "Unauthorized");
        errorResponse.put("code", "UNAUTHORIZED");
        errorResponse.put("message", "Authentifizierung erforderlich: " + ex.getMessage());

        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(errorResponse);
    }

    // ════════════════════════════════════════════════════════════════════════
    // GENERAL EXCEPTIONS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Behandelt NoResourceFoundException (wenn kein Handler gefunden wird) → HTTP 404.
     *
     * Grund: Spring behandelt fehlende Controller-Mappings als "statische Ressource nicht gefunden"
     * und wirft NoResourceFoundException, was standardmäßig zu HTTP 500 führt.
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
     * Behandelt EmailNotVerifiedException → HTTP 403.
     */
    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<Map<String, Object>> handleEmailNotVerifiedException(EmailNotVerifiedException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.FORBIDDEN.value());
        errorResponse.put("error", "Email Not Verified");
        errorResponse.put("message", ex.getMessage());

        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(errorResponse);
    }

    /**
     * Behandelt EmailDeliveryException → HTTP 503 Service Unavailable.
     * 
     * WICHTIG: Diese Exception wird NUR geworfen, wenn eine Operation OHNE erfolgreichen
     * E-Mail-Versand nicht fortgesetzt werden kann.
     * 
     * Für Registrierung wird diese Exception NICHT geworfen - dort gibt's strukturiertes Response.
     */
    @ExceptionHandler(EmailDeliveryException.class)
    public ResponseEntity<Map<String, Object>> handleEmailDeliveryException(EmailDeliveryException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        errorResponse.put("error", "Email Service Unavailable");
        errorResponse.put("message", ex.getMessage());

        return ResponseEntity
            .status(HttpStatus.SERVICE_UNAVAILABLE)
            .body(errorResponse);
    }

    /**
     * Behandelt RateLimitExceededException → HTTP 429 Too Many Requests.
     */
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleRateLimitExceededException(RateLimitExceededException ex) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now().toString());
        errorResponse.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        errorResponse.put("error", "Rate Limit Exceeded");
        errorResponse.put("message", ex.getMessage());

        return ResponseEntity
            .status(HttpStatus.TOO_MANY_REQUESTS)
            .body(errorResponse);
    }

    /**
     * Allgemeiner Exception Handler als Fallback → HTTP 500.
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

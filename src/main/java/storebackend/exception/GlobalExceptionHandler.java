package storebackend.exception;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import storebackend.service.MetricsService;

import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final MetricsService metricsService;

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleEntityNotFound(
            EntityNotFoundException ex, WebRequest request) {

        String endpoint = extractEndpoint(request);
        metricsService.recordApiError(endpoint, extractMethod(request), 404, "ENTITY_NOT_FOUND");

        return buildErrorResponse(
            HttpStatus.NOT_FOUND,
            "Resource not found",
            ex.getMessage(),
            endpoint
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            AccessDeniedException ex, WebRequest request) {

        String endpoint = extractEndpoint(request);
        metricsService.recordApiError(endpoint, extractMethod(request), 403, "ACCESS_DENIED");
        metricsService.recordAuthError("ACCESS_DENIED", endpoint);

        return buildErrorResponse(
            HttpStatus.FORBIDDEN,
            "Access denied",
            ex.getMessage(),
            endpoint
        );
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthentication(
            AuthenticationException ex, WebRequest request) {

        String endpoint = extractEndpoint(request);
        metricsService.recordApiError(endpoint, extractMethod(request), 401, "AUTHENTICATION_FAILED");
        metricsService.recordAuthError("AUTHENTICATION_FAILED", endpoint);

        return buildErrorResponse(
            HttpStatus.UNAUTHORIZED,
            "Authentication failed",
            ex.getMessage(),
            endpoint
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(
            IllegalArgumentException ex, WebRequest request) {

        String endpoint = extractEndpoint(request);
        metricsService.recordApiError(endpoint, extractMethod(request), 400, "INVALID_ARGUMENT");

        return buildErrorResponse(
            HttpStatus.BAD_REQUEST,
            "Invalid request",
            ex.getMessage(),
            endpoint
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(
            Exception ex, WebRequest request) {

        String endpoint = extractEndpoint(request);
        metricsService.recordApiError(endpoint, extractMethod(request), 500, "INTERNAL_ERROR");

        log.error("Unhandled exception at {}: {}", endpoint, ex.getMessage(), ex);

        return buildErrorResponse(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Internal server error",
            ex.getMessage(),
            endpoint
        );
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(
            HttpStatus status, String error, String message, String path) {

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        body.put("path", path);

        return new ResponseEntity<>(body, status);
    }

    private String extractEndpoint(WebRequest request) {
        return request.getDescription(false).replace("uri=", "");
    }

    private String extractMethod(WebRequest request) {
        return request.getContextPath(); // Fallback, kann erweitert werden
    }
}


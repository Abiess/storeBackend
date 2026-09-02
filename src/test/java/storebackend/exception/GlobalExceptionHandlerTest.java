package storebackend.exception;

import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.lang.reflect.Method;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tests für GlobalExceptionHandler.
 *
 * Fokus: MethodArgumentTypeMismatchException (z.B. ?userId=abc auf dem
 * Activity-Log-Endpoint) darf NICHT zu HTTP 500 führen, sondern muss
 * sauber als HTTP 400 Bad Request beantwortet werden.
 */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    /**
     * Dummy-Methode nur zur Erzeugung eines gültigen MethodParameter für den Test.
     */
    @SuppressWarnings("unused")
    private void dummyMethod(Long userId) {
    }

    @Test
    void handleMethodArgumentTypeMismatch_InvalidUserId_ReturnsBadRequestNotServerError() throws NoSuchMethodException {
        // Given: ?userId=abc kann nicht nach Long konvertiert werden
        Method method = GlobalExceptionHandlerTest.class.getDeclaredMethod("dummyMethod", Long.class);
        MethodParameter methodParameter = new MethodParameter(method, 0);
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
            "abc", Long.class, "userId", methodParameter, new NumberFormatException("For input string: \"abc\"")
        );

        // When
        ResponseEntity<Map<String, Object>> response = handler.handleMethodArgumentTypeMismatch(ex);

        // Then: 400 statt 500, kein 500 für einen fehlerhaften Client
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST.value(), response.getBody().get("status"));
        assertEquals("INVALID_QUERY_PARAMETER", response.getBody().get("code"));
        assertEquals("userId", ex.getName());
    }
}

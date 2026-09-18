package storebackend.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Verifiziert, dass {@link RegisterRequest} und {@link LoginRequest} die
 * eingehende E-Mail beim JSON-Binding (setEmail) zentral über
 * {@code storebackend.util.EmailNormalizer} normalisieren - damit sehen
 * Rate-Limiting, CAPTCHA-Schwelle, Security-Event-Logging UND
 * AuthService.register/login automatisch dieselbe normalisierte E-Mail.
 */
class EmailBindingNormalizationTest {

    @Test
    @DisplayName("RegisterRequest: Groß-/Kleinschreibung wird beim Setzen normalisiert")
    void registerRequest_mixedCase_isNormalized() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("Test@Example.com");
        assertEquals("test@example.com", request.getEmail());
    }

    @Test
    @DisplayName("RegisterRequest: führende/nachgestellte Leerzeichen werden entfernt")
    void registerRequest_whitespace_isTrimmed() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("  test@example.com  ");
        assertEquals("test@example.com", request.getEmail());
    }

    @Test
    @DisplayName("LoginRequest: Groß-/Kleinschreibung wird beim Setzen normalisiert")
    void loginRequest_mixedCase_isNormalized() {
        LoginRequest request = new LoginRequest();
        request.setEmail("TEST@EXAMPLE.COM");
        assertEquals("test@example.com", request.getEmail());
    }

    @Test
    @DisplayName("LoginRequest: führende/nachgestellte Leerzeichen werden entfernt")
    void loginRequest_whitespace_isTrimmed() {
        LoginRequest request = new LoginRequest();
        request.setEmail("\ttest@example.com\n");
        assertEquals("test@example.com", request.getEmail());
    }
}

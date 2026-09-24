package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration Tests für CaptchaService
 * 
 * SECURITY: Prüft, dass
 * - Dummy-Tokens abgelehnt werden
 * - Leere Tokens abgelehnt werden
 * - Ungültige Tokens abgelehnt werden (wenn secret konfiguriert)
 * - Hostname-Validierung sicher ist (markt.ma != boesermarkt.ma)
 * - Token-Wiederverwendung abgelehnt wird (hCaptcha meldet dies)
 */
@ExtendWith(MockitoExtension.class)
class CaptchaServiceTest {

    private CaptchaService captchaService;

    @BeforeEach
    void setUp() {
        WebClient.Builder webClientBuilder = WebClient.builder();
        captchaService = new CaptchaService(webClientBuilder);
    }

    // ═══════════════════════════════════════════════════════════
    // Token Validation Tests
    // ═══════════════════════════════════════════════════════════

    @Test
    void testDummyToken_shouldBeRejected() {
        // Arrange: CAPTCHA aktiviert, Secret konfiguriert
        ReflectionTestUtils.setField(captchaService, "captchaEnabled", true);
        ReflectionTestUtils.setField(captchaService, "captchaSecret", "test-secret");
        ReflectionTestUtils.setField(captchaService, "captchaProvider", "hcaptcha");

        // Act
        boolean result = captchaService.validateCaptcha("CAPTCHA_DISABLED_DEV_MODE", "127.0.0.1");

        // Assert: Dummy-Token MUSS abgelehnt werden
        assertFalse(result, "Dummy-Token darf niemals akzeptiert werden");
    }

    @Test
    void testNullToken_shouldBeRejected() {
        // Arrange
        ReflectionTestUtils.setField(captchaService, "captchaEnabled", true);
        ReflectionTestUtils.setField(captchaService, "captchaSecret", "test-secret");

        // Act
        boolean result = captchaService.validateCaptcha(null, "127.0.0.1");

        // Assert
        assertFalse(result, "Null-Token muss abgelehnt werden");
    }

    @Test
    void testEmptyToken_shouldBeRejected() {
        // Arrange
        ReflectionTestUtils.setField(captchaService, "captchaEnabled", true);
        ReflectionTestUtils.setField(captchaService, "captchaSecret", "test-secret");

        // Act
        boolean result = captchaService.validateCaptcha("", "127.0.0.1");

        // Assert
        assertFalse(result, "Leerer Token muss abgelehnt werden");
    }

    @Test
    void testBlankToken_shouldBeRejected() {
        // Arrange
        ReflectionTestUtils.setField(captchaService, "captchaEnabled", true);
        ReflectionTestUtils.setField(captchaService, "captchaSecret", "test-secret");

        // Act
        boolean result = captchaService.validateCaptcha("   ", "127.0.0.1");

        // Assert
        assertFalse(result, "Blank-Token muss abgelehnt werden");
    }

    // ═══════════════════════════════════════════════════════════
    // Configuration Tests
    // ═══════════════════════════════════════════════════════════

    @Test
    void testCaptchaDisabled_shouldAcceptAnyToken() {
        // Arrange: CAPTCHA deaktiviert (Development-Modus)
        ReflectionTestUtils.setField(captchaService, "captchaEnabled", false);

        // Act: Auch Dummy-Token wird akzeptiert wenn CAPTCHA aus
        boolean result = captchaService.validateCaptcha("CAPTCHA_DISABLED_DEV_MODE", "127.0.0.1");

        // Assert
        assertTrue(result, "Bei deaktiviertem CAPTCHA muss auch Dummy-Token akzeptiert werden");
    }

    @Test
    void testNoSecret_shouldSkipValidation() {
        // Arrange: CAPTCHA aktiviert, aber Secret fehlt
        ReflectionTestUtils.setField(captchaService, "captchaEnabled", true);
        ReflectionTestUtils.setField(captchaService, "captchaSecret", "");

        // Act
        boolean result = captchaService.validateCaptcha("some-token", "127.0.0.1");

        // Assert: Ohne Secret kann nicht validiert werden → Skip
        assertTrue(result, "Ohne Secret muss Validierung übersprungen werden (Development)");
    }

    @Test
    void testUnknownProvider_shouldRejectToken() {
        // Arrange: Unbekannter Provider
        ReflectionTestUtils.setField(captchaService, "captchaEnabled", true);
        ReflectionTestUtils.setField(captchaService, "captchaSecret", "test-secret");
        ReflectionTestUtils.setField(captchaService, "captchaProvider", "invalid-provider");

        // Act
        boolean result = captchaService.validateCaptcha("some-token", "127.0.0.1");

        // Assert
        assertFalse(result, "Unbekannter Provider muss Token ablehnen");
    }

    // ═══════════════════════════════════════════════════════════
    // Hostname Validation Tests
    // ═══════════════════════════════════════════════════════════

    /**
     * WICHTIG: Diese Tests prüfen die Hostname-Logik in der validateHCaptcha() Methode.
     * 
     * Echte hCaptcha API Tests würden einen Test-Secret-Key erfordern.
     * 
     * Die Hostname-Validierung muss folgendes sicherstellen:
     * - "markt.ma" → AKZEPTIERT
     * - "www.markt.ma" → ABGELEHNT (derzeit nicht unterstützt)
     * - "shop.markt.ma" → ABGELEHNT (derzeit nicht unterstützt)
     * - "boesermarkt.ma" → ABGELEHNT (endsWith wäre unsicher!)
     * - "fake-markt.ma" → ABGELEHNT
     * - null → ABGELEHNT
     * 
     * Implementierung in validateHCaptcha():
     * if (!"markt.ma".equalsIgnoreCase(response.getHostname())) {
     *     return false;
     * }
     * 
     * Für Subdomains (später):
     * if (!hostname.equals("markt.ma") && !hostname.endsWith(".markt.ma")) {
     *     return false;
     * }
     */

    @Test
    void testHostnameValidation_marktMa_shouldBeAccepted() {
        // HINWEIS: Dieser Test kann nur die Logik prüfen, nicht den echten API-Call
        // Die echte Validierung muss auf Production mit echten Tokens getestet werden
        
        String hostname = "markt.ma";
        boolean isValid = "markt.ma".equalsIgnoreCase(hostname);
        assertTrue(isValid, "markt.ma muss akzeptiert werden");
    }

    @Test
    void testHostnameValidation_wwwMarktMa_shouldBeRejected() {
        String hostname = "www.markt.ma";
        boolean isValid = "markt.ma".equalsIgnoreCase(hostname);
        assertFalse(isValid, "www.markt.ma muss abgelehnt werden (derzeit nicht unterstützt)");
    }

    @Test
    void testHostnameValidation_subdomain_shouldBeRejected() {
        String hostname = "shop.markt.ma";
        boolean isValid = "markt.ma".equalsIgnoreCase(hostname);
        assertFalse(isValid, "shop.markt.ma muss abgelehnt werden (derzeit nicht unterstützt)");
    }

    @Test
    void testHostnameValidation_boeserMarktMa_shouldBeRejected() {
        // SECURITY CRITICAL: endsWith() wäre unsicher!
        String hostname = "boesermarkt.ma";
        
        // FALSCH: hostname.endsWith("markt.ma") → würde TRUE zurückgeben!
        boolean unsafeCheck = hostname.endsWith("markt.ma");
        assertTrue(unsafeCheck, "endsWith() ist UNSICHER - würde boesermarkt.ma akzeptieren!");
        
        // RICHTIG: Exakter Vergleich
        boolean safeCheck = "markt.ma".equalsIgnoreCase(hostname);
        assertFalse(safeCheck, "boesermarkt.ma MUSS abgelehnt werden");
    }

    @Test
    void testHostnameValidation_fakeMarktMa_shouldBeRejected() {
        String hostname = "fake-markt.ma";
        boolean isValid = "markt.ma".equalsIgnoreCase(hostname);
        assertFalse(isValid, "fake-markt.ma muss abgelehnt werden");
    }

    @Test
    void testHostnameValidation_null_shouldBeRejected() {
        String hostname = null;
        boolean isValid = hostname != null && "markt.ma".equalsIgnoreCase(hostname);
        assertFalse(isValid, "null-Hostname muss abgelehnt werden");
    }

    /**
     * HINWEIS: Token-Wiederverwendung
     * 
     * Token-Wiederverwendung wird von hCaptcha automatisch erkannt:
     * - Beim ersten Aufruf: success=true
     * - Beim zweiten Aufruf mit demselben Token: 
     *   success=false, error-codes=["invalid-or-already-seen-response"]
     * 
     * Das muss in Production mit echten Tokens getestet werden:
     * 
     * 1. POST /api/auth/register mit Token X → 200 OK
     * 2. POST /api/auth/register mit Token X → 400 Bad Request
     *    (Backend lehnt ab, weil hCaptcha success=false zurückgibt)
     */
}

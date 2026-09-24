package storebackend.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Unit-Tests für {@link EmailNormalizer} - die EINE zentrale Stelle, die
 * für die E-Mail-Duplikat-Prävention (case-insensitive) genutzt wird
 * (siehe User#setEmail, AuthService, PasswordResetService,
 * EmailVerificationService, TeamInvitationService,
 * WooCommerceImportService, PublicStoreCreationController, LoginRequest,
 * RegisterRequest).
 */
class EmailNormalizerTest {

    @Test
    @DisplayName("lowercase E-Mail bleibt unverändert")
    void alreadyLowercase_staysUnchanged() {
        assertEquals("test@example.com", EmailNormalizer.normalize("test@example.com"));
    }

    @Test
    @DisplayName("Großbuchstaben werden auf Kleinbuchstaben normalisiert")
    void mixedCase_isLowercased() {
        assertEquals("test@example.com", EmailNormalizer.normalize("Test@Example.com"));
        assertEquals("essoudati@hotmail.de", EmailNormalizer.normalize("Essoudati@hotmail.de"));
        assertEquals("essoudati@hotmail.de", EmailNormalizer.normalize("ESSOUDATI@HOTMAIL.DE"));
    }

    @Test
    @DisplayName("Führende/nachgestellte Leerzeichen werden entfernt")
    void leadingTrailingWhitespace_isTrimmed() {
        assertEquals("test@example.com", EmailNormalizer.normalize("  test@example.com  "));
        assertEquals("test@example.com", EmailNormalizer.normalize("\ttest@example.com\n"));
    }

    @Test
    @DisplayName("Whitespace UND Groß-/Kleinschreibung werden gemeinsam normalisiert")
    void whitespaceAndCase_areBothNormalized() {
        assertEquals("test@example.com", EmailNormalizer.normalize("  Test@Example.com  "));
    }

    @Test
    @DisplayName("null bleibt null (keine NPE)")
    void nullInput_returnsNull() {
        assertNull(EmailNormalizer.normalize(null));
    }
}

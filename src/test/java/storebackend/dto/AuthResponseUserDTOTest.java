package storebackend.dto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import storebackend.enums.AppAccessMode;
import storebackend.enums.AppKey;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Rückwärtskompatibilitäts-Test für {@link AuthResponse.UserDTO}
 * (App-Entitlement-Konzept, Phase 1).
 *
 * Stellt sicher, dass bestehende Aufrufstellen (z.B. PhoneAuthController),
 * die weiterhin den ursprünglichen 5-Parameter-Konstruktor verwenden, ohne
 * Anpassung funktionieren und appAccessMode/apps additiv null bleiben.
 */
class AuthResponseUserDTOTest {

    @Test
    @DisplayName("Bestehender 5-Parameter-Konstruktor (Legacy-Aufrufstellen) bleibt unverändert nutzbar")
    void legacyFiveArgConstructor_stillWorks_withNullAppFields() {
        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
            1L, "user@example.com", "Test User", "USER", List.of("USER"));

        assertEquals(1L, userDTO.getId());
        assertEquals("user@example.com", userDTO.getEmail());
        assertEquals("Test User", userDTO.getName());
        assertEquals("USER", userDTO.getRole());
        assertEquals(List.of("USER"), userDTO.getRoles());

        // additive Felder bleiben bei Legacy-Konstruktor unbelegt (kein Verhaltensbruch)
        assertNull(userDTO.getAppAccessMode());
        assertNull(userDTO.getApps());
    }

    @Test
    @DisplayName("Neuer 7-Parameter-Konstruktor (AuthService) befüllt appAccessMode/apps zusätzlich")
    void extendedSevenArgConstructor_populatesAppFields() {
        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
            1L, "user@example.com", "Test User", "USER", List.of("USER"),
            AppAccessMode.MANAGED,
            List.of(new AppEntitlementDTO(AppKey.DHL, 10L, true)));

        assertEquals(AppAccessMode.MANAGED, userDTO.getAppAccessMode());
        assertEquals(1, userDTO.getApps().size());
        assertEquals(AppKey.DHL, userDTO.getApps().get(0).getApp());
    }
}

package storebackend.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Verifiziert, dass {@link User#setEmail(String)} JEDE E-Mail zentral über
 * {@code storebackend.util.EmailNormalizer} normalisiert - unabhängig davon,
 * von welchem Call-Site der User erzeugt/aktualisiert wird (Registrierung,
 * Phone-Auth, anonyme Store-Erstellung, WooCommerce-Import, Admin-Tools, ...).
 * Dies ist die letzte Verteidigungslinie gegen E-Mail-Case-Duplikate wie
 * "essoudati@hotmail.de" vs. "Essoudati@hotmail.de".
 */
class UserTest {

    @Test
    @DisplayName("setEmail normalisiert Groß-/Kleinschreibung")
    void setEmail_mixedCase_isNormalized() {
        User user = new User();
        user.setEmail("Essoudati@Hotmail.de");
        assertEquals("essoudati@hotmail.de", user.getEmail());
    }

    @Test
    @DisplayName("setEmail entfernt führende/nachgestellte Leerzeichen")
    void setEmail_whitespace_isTrimmed() {
        User user = new User();
        user.setEmail("  test@example.com  ");
        assertEquals("test@example.com", user.getEmail());
    }

    @Test
    @DisplayName("setEmail(null) wirft keine NPE und bleibt null")
    void setEmail_null_staysNull() {
        User user = new User();
        user.setEmail(null);
        assertNull(user.getEmail());
    }
}

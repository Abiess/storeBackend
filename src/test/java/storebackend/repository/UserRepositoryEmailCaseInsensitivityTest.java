package storebackend.repository;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import storebackend.entity.User;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integrationstest für die E-Mail-Case-Insensitivität von
 * {@link UserRepository#findByEmail} / {@link UserRepository#existsByEmail}
 * sowie für die (bereits jetzt, auch ohne den case-insensitiven
 * PostgreSQL-Index aus scripts/db/migrations/V026__unique_index_users_email_lower.sql,
 * wirksame) DB-Absicherung gegen Case-Duplikate:
 *
 * Da {@link User#setEmail(String)} JEDE E-Mail zentral über
 * {@code storebackend.util.EmailNormalizer} normalisiert, landen zwei
 * versuchte Registrierungen mit "essoudati@hotmail.de" und
 * "Essoudati@Hotmail.de" BEIDE als identischer String in der DB - der
 * bestehende {@code @Column(unique = true)}-Constraint auf {@code users.email}
 * (siehe User-Entity) greift dadurch bereits in H2 (Test-DB), ganz ohne
 * PostgreSQL-spezifischen {@code LOWER()}-Index.
 *
 * Der zusätzliche case-insensitive Unique-Index (V026) ist Defense-in-Depth
 * für Produktions-PostgreSQL, u.a. für den Fall von direkten SQL-Inserts
 * ohne Anwendungscode - siehe {@link storebackend.migration.EmailUniqueIndexMigrationSqlTest}.
 */
@DataJpaTest
class UserRepositoryEmailCaseInsensitivityTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManager entityManager;

    private User persistUser(String email) {
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash("hash");
        user.setEmailVerified(true);
        user.setPreferredLanguage("de");
        return userRepository.saveAndFlush(user);
    }

    @Test
    @DisplayName("Gespeicherte E-Mail wird normalisiert (lowercase) abgelegt")
    void savedEmail_isStoredNormalized() {
        User saved = persistUser("Essoudati@Hotmail.de");
        assertThat(saved.getEmail()).isEqualTo("essoudati@hotmail.de");
    }

    @Test
    @DisplayName("findByEmail findet den User unabhängig von Groß-/Kleinschreibung der Suchanfrage")
    void findByEmail_isCaseInsensitive() {
        persistUser("test@example.com");

        assertThat(userRepository.findByEmail("test@example.com")).isPresent();
        assertThat(userRepository.findByEmail("Test@Example.com")).isPresent();
        assertThat(userRepository.findByEmail("TEST@EXAMPLE.COM")).isPresent();
    }

    @Test
    @DisplayName("existsByEmail erkennt Duplikate unabhängig von Groß-/Kleinschreibung")
    void existsByEmail_isCaseInsensitive() {
        persistUser("test@example.com");

        assertThat(userRepository.existsByEmail("test@example.com")).isTrue();
        assertThat(userRepository.existsByEmail("Test@Example.com")).isTrue();
        assertThat(userRepository.existsByEmail("TEST@EXAMPLE.COM")).isTrue();
        assertThat(userRepository.existsByEmail("other@example.com")).isFalse();
    }

    @Test
    @DisplayName("Zwei User mit derselben E-Mail in unterschiedlicher Groß-/Kleinschreibung verletzen den DB-Unique-Constraint")
    void duplicateEmailDifferentCase_violatesUniqueConstraint() {
        persistUser("essoudati@hotmail.de");

        User duplicate = new User();
        duplicate.setEmail("Essoudati@Hotmail.de"); // wird intern zu "essoudati@hotmail.de" normalisiert
        duplicate.setPasswordHash("hash");
        duplicate.setEmailVerified(true);
        duplicate.setPreferredLanguage("de");

        assertThrows(DataIntegrityViolationException.class, () -> {
            userRepository.saveAndFlush(duplicate);
        });
    }
}

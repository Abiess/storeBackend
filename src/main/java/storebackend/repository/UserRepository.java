package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.User;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Case-insensitiver Lookup (DEFENSE-IN-DEPTH): E-Mails werden zwar bereits
     * zentral über {@code storebackend.util.EmailNormalizer} normalisiert
     * (siehe {@code User#setEmail} sowie alle Call-Sites in AuthService,
     * PasswordResetService, etc.), damit auch bei einem vergessenen
     * Normalisierungs-Aufruf oder bei (nicht mehr erlaubten) historischen
     * Alt-Daten mit gemischter Groß-/Kleinschreibung kein Duplikat wie
     * "essoudati@hotmail.de" vs. "Essoudati@hotmail.de" entstehen bzw.
     * unentdeckt bleiben kann, wird hier zusätzlich case-insensitiv verglichen.
     */
    @Query("SELECT u FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<User> findByEmail(@Param("email") String email);

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END FROM User u WHERE LOWER(u.email) = LOWER(:email)")
    boolean existsByEmail(@Param("email") String email);

    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByPhoneNumber(String phoneNumber);

    /**
     * App Provisioning Phase 1 (Platform Administration) - einfache
     * Freitext-Suche für die Platform-Admin-Benutzersuche
     * ({@code GET /api/admin/app-provisioning/users?query=...}). Sucht in
     * E-Mail ODER Name (case-insensitive), bewusst ohne Pagination (Phase 1,
     * siehe ARCHITECTURE_APP_FACTORY.md Abschnitt 14/15 - Ergebnisliste wird
     * vom Controller zusätzlich begrenzt).
     */
    java.util.List<User> findTop25ByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(String email, String name);
}



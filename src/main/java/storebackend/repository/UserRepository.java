package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.User;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
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



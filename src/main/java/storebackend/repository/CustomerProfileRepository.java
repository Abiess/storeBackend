package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.CustomerProfile;
import storebackend.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, Long> {
    Optional<CustomerProfile> findByUser(User user);
    Optional<CustomerProfile> findByUserId(Long userId);
    Optional<CustomerProfile> findByUserIdAndStoreId(Long userId, Long storeId);
    Optional<CustomerProfile> findByStoreIdAndExternalSourceAndExternalId(Long storeId, String externalSource, String externalId);

    /**
     * Store-Kunden für Kundenauswahl (z.B. Loyalty-Code-Registrierung).
     * Ohne Suchbegriff werden die zuletzt angelegten Kunden geliefert.
     */
    @Query("SELECT cp FROM CustomerProfile cp WHERE cp.store.id = :storeId ORDER BY cp.id DESC")
    List<CustomerProfile> findRecentByStoreId(@Param("storeId") Long storeId);

    @Query("SELECT cp FROM CustomerProfile cp WHERE cp.store.id = :storeId AND (" +
        "LOWER(cp.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "LOWER(cp.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "LOWER(cp.user.email) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "LOWER(cp.user.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "cp.phone LIKE CONCAT('%', :query, '%')) " +
        "ORDER BY cp.id DESC")
    List<CustomerProfile> searchByStoreId(@Param("storeId") Long storeId, @Param("query") String query);
}


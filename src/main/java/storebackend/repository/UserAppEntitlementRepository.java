package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.UserAppEntitlement;
import storebackend.enums.AppKey;

import java.util.List;
import java.util.Optional;

/**
 * App-Entitlement-Konzept (Phase 1). Bewusst ID-basierte Query-Methoden
 * (kein Navigieren über volle Entity-Graphen), analog zu bestehenden
 * Repositories wie {@code StoreRoleRepository}.
 */
@Repository
public interface UserAppEntitlementRepository extends JpaRepository<UserAppEntitlement, Long> {

    /**
     * Ermittelt, ob für den User ÜBERHAUPT EIN Entitlement-Eintrag existiert
     * (egal welche App/welcher Store) - Grundlage für die userweite
     * LEGACY/MANAGED-Entscheidung in {@code AppAccessChecker}.
     */
    boolean existsByUserId(Long userId);

    /**
     * Alle Entitlement-Einträge eines Users (für AuthResponse.apps).
     */
    List<UserAppEntitlement> findByUserId(Long userId);

    /**
     * Eintrag für eine STORE-Scope-App (storeId != null).
     */
    Optional<UserAppEntitlement> findByUserIdAndAppAndStoreId(Long userId, AppKey app, Long storeId);

    /**
     * Eintrag für eine GLOBAL-Scope-App (storeId == null).
     * Eigene Methode nötig, da "findByUserIdAndAppAndStoreId(userId, app, null)"
     * in SQL zu "store_id = NULL" (nie wahr) statt "store_id IS NULL" führen würde.
     */
    Optional<UserAppEntitlement> findByUserIdAndAppAndStoreIdIsNull(Long userId, AppKey app);
}

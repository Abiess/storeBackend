package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DhlZone;

import java.util.List;
import java.util.Optional;

/**
 * DHL Zone Repository (Phase 3A)
 * 
 * MULTI-TENANT SICHERHEIT:
 * - Alle Queries müssen storeId berücksichtigen
 */
@Repository
public interface DhlZoneRepository extends JpaRepository<DhlZone, Long> {
    
    /**
     * Findet alle Zonen eines Stores
     */
    @Query("SELECT z FROM DhlZone z WHERE z.store.id = :storeId ORDER BY z.sortOrder ASC, z.name ASC")
    List<DhlZone> findByStoreIdOrderBySortOrder(@Param("storeId") Long storeId);
    
    /**
     * Findet Zone anhand Store + ID (Multi-Tenant Check)
     */
    @Query("SELECT z FROM DhlZone z WHERE z.store.id = :storeId AND z.id = :zoneId")
    Optional<DhlZone> findByStoreIdAndId(
        @Param("storeId") Long storeId,
        @Param("zoneId") Long zoneId
    );
    
    /**
     * Prüft ob Zone-Name bereits existiert (pro Store)
     */
    @Query("SELECT COUNT(z) > 0 FROM DhlZone z WHERE z.store.id = :storeId AND z.name = :name AND (:excludeId IS NULL OR z.id != :excludeId)")
    boolean existsByStoreIdAndName(
        @Param("storeId") Long storeId,
        @Param("name") String name,
        @Param("excludeId") Long excludeId
    );
}

package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DhlShelfSlotLayout;

import java.util.List;
import java.util.Optional;

/**
 * DHL Shelf Slot Layout Repository (Phase 3A)
 * 
 * MULTI-TENANT SICHERHEIT:
 * - Alle Queries müssen storeId berücksichtigen
 */
@Repository
public interface DhlShelfSlotLayoutRepository extends JpaRepository<DhlShelfSlotLayout, Long> {
    
    /**
     * Findet alle Layouts eines Stores
     * 
     * Eager Loading von shelfSlot + zone um N+1 zu vermeiden
     */
    @Query("SELECT l FROM DhlShelfSlotLayout l " +
           "LEFT JOIN FETCH l.shelfSlot " +
           "LEFT JOIN FETCH l.zone " +
           "WHERE l.store.id = :storeId " +
           "ORDER BY l.gridY ASC, l.gridX ASC")
    List<DhlShelfSlotLayout> findByStoreIdWithSlotAndZone(@Param("storeId") Long storeId);
    
    /**
     * Findet Layout für einen bestimmten Slot
     */
    @Query("SELECT l FROM DhlShelfSlotLayout l WHERE l.store.id = :storeId AND l.shelfSlot.id = :slotId")
    Optional<DhlShelfSlotLayout> findByStoreIdAndSlotId(
        @Param("storeId") Long storeId,
        @Param("slotId") Long slotId
    );
    
    /**
     * Löscht Layout für einen Slot
     */
    @Modifying
    @Query("DELETE FROM DhlShelfSlotLayout l WHERE l.store.id = :storeId AND l.shelfSlot.id = :slotId")
    void deleteByStoreIdAndSlotId(
        @Param("storeId") Long storeId,
        @Param("slotId") Long slotId
    );
    
    /**
     * Prüft ob Layout für Slot existiert
     */
    @Query("SELECT COUNT(l) > 0 FROM DhlShelfSlotLayout l WHERE l.store.id = :storeId AND l.shelfSlot.id = :slotId")
    boolean existsByStoreIdAndSlotId(
        @Param("storeId") Long storeId,
        @Param("slotId") Long slotId
    );
}

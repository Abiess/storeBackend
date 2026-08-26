package storebackend.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DhlShelfSlot;

import java.util.List;
import java.util.Optional;

/**
 * DHL Shelf Slot Repository
 * 
 * RACE-CONDITION-SAFE:
 * - findNextFreeSlotForUpdate() nutzt PESSIMISTIC_WRITE Lock
 * - Parallel laufende Transaktionen warten
 * - Garantiert unterschiedliche Slots
 */
@Repository
public interface DhlShelfSlotRepository extends JpaRepository<DhlShelfSlot, Long> {
    
    /**
     * Findet nächsten freien Slot für automatische Zuweisung (RACE-CONDITION-SAFE)
     * 
     * PESSIMISTIC_WRITE Lock:
     * - Sperrt den gefundenen Slot während der Transaction
     * - Zweite parallele Transaction wartet
     * - Garantiert: Jede Transaction bekommt unterschiedlichen Slot
     * 
     * Query-Logik:
     * - Nur aktive Slots
     * - Slot ist frei wenn KEIN Paket mit status=STORED existiert
     * - Sortiert nach sortOrder (nicht String!)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @return Optional<DhlShelfSlot> oder empty wenn alle belegt
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT s FROM DhlShelfSlot s 
        WHERE s.store.id = :storeId 
        AND s.active = true
        AND NOT EXISTS (
            SELECT 1 FROM DhlParcel p 
            WHERE p.shelfSlot.id = s.id 
            AND p.status = 'STORED'
        )
        ORDER BY s.sortOrder ASC
        LIMIT 1
        """)
    Optional<DhlShelfSlot> findNextFreeSlotForUpdate(@Param("storeId") Long storeId);
    
    /**
     * Listet alle Slots eines Stores (für Grid-Visualisierung)
     * 
     * @param storeId Store ID
     * @return List<DhlShelfSlot> sortiert nach sortOrder
     */
    @Query("SELECT s FROM DhlShelfSlot s WHERE s.store.id = :storeId ORDER BY s.sortOrder ASC")
    List<DhlShelfSlot> findByStoreIdOrderBySortOrder(@Param("storeId") Long storeId);
    
    /**
     * Findet Slot anhand Code
     * 
     * @param storeId Store ID
     * @param code Slot-Code (z.B. "A1")
     * @return Optional<DhlShelfSlot>
     */
    @Query("SELECT s FROM DhlShelfSlot s WHERE s.store.id = :storeId AND s.code = :code")
    Optional<DhlShelfSlot> findByStoreIdAndCode(
        @Param("storeId") Long storeId,
        @Param("code") String code
    );
    
    /**
     * Zählt aktive Slots
     * 
     * @param storeId Store ID
     * @return Anzahl aktiver Slots
     */
    @Query("SELECT COUNT(s) FROM DhlShelfSlot s WHERE s.store.id = :storeId AND s.active = true")
    long countActiveSlots(@Param("storeId") Long storeId);
    
    /**
     * Zählt freie Slots
     * 
     * @param storeId Store ID
     * @return Anzahl freier Slots
     */
    @Query("""
        SELECT COUNT(s) FROM DhlShelfSlot s 
        WHERE s.store.id = :storeId 
        AND s.active = true
        AND NOT EXISTS (
            SELECT 1 FROM DhlParcel p 
            WHERE p.shelfSlot.id = s.id 
            AND p.status = 'STORED'
        )
        """)
    long countFreeSlots(@Param("storeId") Long storeId);
    
    /**
     * Prüft ob Store bereits Slots hat
     * 
     * @param storeId Store ID
     * @return true wenn Slots vorhanden
     */
    @Query("SELECT COUNT(s) > 0 FROM DhlShelfSlot s WHERE s.store.id = :storeId")
    boolean existsByStoreId(@Param("storeId") Long storeId);
}

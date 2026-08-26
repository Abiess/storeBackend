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
     * Findet nächsten Slot mit freier Kapazität für automatische Zuweisung (RACE-CONDITION-SAFE)
     * 
     * Phase 2.1: Capacity-based allocation
     * 
     * PESSIMISTIC_WRITE Lock:
     * - Sperrt den gefundenen Slot während der Transaction
     * - Zweite parallele Transaction wartet
     * - Garantiert: Parallel-Requests überschreiten niemals capacity
     * 
     * Query-Logik:
     * - Nur aktive Slots
     * - Slot hat freie Kapazität wenn: COUNT(STORED parcels) < capacity
     * - Sortiert nach sortOrder (nicht String!)
     * 
     * Beispiel:
     * A1 capacity=3, occupied=2 → bekommt nächstes Paket
     * A1 capacity=3, occupied=3 → übersprungen, nächster Slot
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @return Optional<DhlShelfSlot> oder empty wenn alle voll
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT s FROM DhlShelfSlot s 
        WHERE s.store.id = :storeId 
        AND s.active = true
        AND (
            SELECT COUNT(p) FROM DhlParcel p 
            WHERE p.shelfSlot.id = s.id 
            AND p.status = 'STORED'
        ) < s.capacity
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
     * Berechnet Gesamtkapazität aller aktiven Slots
     * 
     * Phase 2.1: Summe aller capacity-Werte
     * 
     * @param storeId Store ID
     * @return Gesamtanzahl Paketplätze
     */
    @Query("SELECT COALESCE(SUM(s.capacity), 0) FROM DhlShelfSlot s WHERE s.store.id = :storeId AND s.active = true")
    long sumTotalCapacity(@Param("storeId") Long storeId);
    
    /**
     * Zählt belegte Paketplätze
     * 
     * Phase 2.1: Nicht Anzahl voller Slots, sondern Anzahl eingelagerter Pakete
     * 
     * @param storeId Store ID
     * @return Anzahl eingelagerter Pakete
     */
    @Query("SELECT COUNT(p) FROM DhlParcel p WHERE p.store.id = :storeId AND p.status = 'STORED'")
    long countOccupiedParcels(@Param("storeId") Long storeId);
    
    /**
     * Zählt aktive Slots (unverändert)
     * 
     * @param storeId Store ID
     * @return Anzahl aktiver Slots
     */
    @Query("SELECT COUNT(s) FROM DhlShelfSlot s WHERE s.store.id = :storeId AND s.active = true")
    long countActiveSlots(@Param("storeId") Long storeId);
    
    /**
     * Zählt Slots mit freier Kapazität
     * 
     * Phase 2.1: Slot zählt als "frei" wenn occupiedCount < capacity
     * 
     * @param storeId Store ID
     * @return Anzahl Slots mit Platz
     */
    @Query("""
        SELECT COUNT(s) FROM DhlShelfSlot s 
        WHERE s.store.id = :storeId 
        AND s.active = true
        AND (
            SELECT COUNT(p) FROM DhlParcel p 
            WHERE p.shelfSlot.id = s.id 
            AND p.status = 'STORED'
        ) < s.capacity
        """)
    long countSlotsWithCapacity(@Param("storeId") Long storeId);
    
    /**
     * Prüft ob Store bereits Slots hat
     * 
     * @param storeId Store ID
     * @return true wenn Slots vorhanden
     */
    @Query("SELECT COUNT(s) > 0 FROM DhlShelfSlot s WHERE s.store.id = :storeId")
    boolean existsByStoreId(@Param("storeId") Long storeId);
    
    /**
     * Findet maximale sortOrder für Store (Phase 3A)
     * 
     * Für neue Slots: maxSortOrder + 1
     * 
     * @param storeId Store ID
     * @return max sort_order oder null
     */
    @Query("SELECT MAX(s.sortOrder) FROM DhlShelfSlot s WHERE s.store.id = :storeId")
    Integer findMaxSortOrderByStoreId(@Param("storeId") Long storeId);
    
    /**
     * Prüft ob Slot-Code bereits existiert (Phase 3A)
     * 
     * @param storeId Store ID
     * @param code Slot-Code
     * @return true wenn Code bereits verwendet
     */
    @Query("SELECT COUNT(s) > 0 FROM DhlShelfSlot s WHERE s.store.id = :storeId AND s.code = :code")
    boolean existsByStoreIdAndCode(
        @Param("storeId") Long storeId,
        @Param("code") String code
    );
}

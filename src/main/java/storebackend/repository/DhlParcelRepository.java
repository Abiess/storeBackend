package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DhlParcel;
import storebackend.enums.DhlParcelStatus;

import java.util.List;
import java.util.Optional;

/**
 * DHL Parcel Repository
 * 
 * MULTI-TENANT SICHERHEIT:
 * - Alle Queries müssen storeId berücksichtigen
 * - Keine globale Suche über alle Stores erlaubt
 */
@Repository
public interface DhlParcelRepository extends JpaRepository<DhlParcel, Long> {
    
    /**
     * Findet den/die aktiven Datensätze (Status STORED oder PICKED_UP) für
     * Store + Tracking-Code, neuester zuerst.
     * 
     * WARUM "List" statt "Optional" auf einer ungeordneten Query:
     * Historisch kann es für denselben (store_id, tracking_code) mehrere
     * CANCELLED-Datensätze geben (Tracking-Code-Wiederverwendung nach
     * Stornierung, siehe V017/DhlParcelStatus.CANCELLED). Der DB-seitige
     * Partial Unique Index "idx_dhl_parcels_active_tracking" garantiert
     * zwar, dass zu jedem Zeitpunkt höchstens EIN Datensatz mit Status
     * STORED/PICKED_UP existiert - trotzdem wird hier defensiv mit
     * "ORDER BY id DESC" gearbeitet und das erste Element aus der Liste
     * gelesen (statt eine ungeordnete Query direkt auf Optional zu mappen),
     * damit unter keinen Umständen eine NonUniqueResultException auftreten
     * kann, selbst wenn sich die DB-Invariante einmal ändern sollte.
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param trackingCode Normalisierter Tracking-Code
     * @param statuses Aktive Status (STORED, PICKED_UP)
     * @return Liste der aktiven Datensätze, neuester (höchste id) zuerst
     */
    @Query("SELECT p FROM DhlParcel p WHERE p.store.id = :storeId AND p.trackingCode = :trackingCode " +
           "AND p.status IN :statuses ORDER BY p.id DESC")
    List<DhlParcel> findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
        @Param("storeId") Long storeId,
        @Param("trackingCode") String trackingCode,
        @Param("statuses") List<DhlParcelStatus> statuses
    );
    
    /**
     * Listet alle aktiven (eingelagerten) Pakete eines Stores
     * 
     * @param storeId Store ID
     * @param status Status Filter (z.B. STORED)
     * @return List<DhlParcel>
     */
    @Query("SELECT p FROM DhlParcel p WHERE p.store.id = :storeId AND p.status = :status ORDER BY p.receivedAt DESC")
    List<DhlParcel> findByStoreIdAndStatus(
        @Param("storeId") Long storeId,
        @Param("status") DhlParcelStatus status
    );
    
    /**
     * Zählt aktive (eingelagerte) Pakete eines Stores
     * 
     * @param storeId Store ID
     * @param status Status Filter
     * @return Anzahl
     */
    @Query("SELECT COUNT(p) FROM DhlParcel p WHERE p.store.id = :storeId AND p.status = :status")
    long countByStoreIdAndStatus(
        @Param("storeId") Long storeId,
        @Param("status") DhlParcelStatus status
    );
    
    /**
     * Zählt Pakete in einem bestimmten Slot mit Status
     * 
     * Für Kapazitätsprüfung bei manueller Slot-Auswahl (Phase 3A.3)
     * 
     * @param storeId Store ID
     * @param slotId Slot ID
     * @param status Status (typisch STORED)
     * @return Anzahl belegter Plätze
     */
    @Query("SELECT COUNT(p) FROM DhlParcel p WHERE p.store.id = :storeId AND p.shelfSlot.id = :slotId AND p.status = :status")
    long countByStoreIdAndShelfSlotIdAndStatus(
        @Param("storeId") Long storeId,
        @Param("slotId") Long slotId,
        @Param("status") DhlParcelStatus status
    );
    
    /**
     * Listet alle Pakete eines Stores (alle Status)
     * 
     * @param storeId Store ID
     * @return List<DhlParcel>
     */
    @Query("SELECT p FROM DhlParcel p WHERE p.store.id = :storeId ORDER BY p.receivedAt DESC")
    List<DhlParcel> findByStoreId(@Param("storeId") Long storeId);
    
    /**
     * Findet Paket anhand Store + Parcel ID (Phase 3A.4 - Paket-Korrektur)
     * 
     * MULTI-TENANT SECURITY:
     * - IMMER storeId + parcelId verwenden
     * - NIE nur findById(parcelId)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param parcelId Parcel ID
     * @return Optional<DhlParcel>
     */
    @Query("SELECT p FROM DhlParcel p WHERE p.store.id = :storeId AND p.id = :parcelId")
    Optional<DhlParcel> findByStoreIdAndId(
        @Param("storeId") Long storeId,
        @Param("parcelId") Long parcelId
    );
    
    /**
     * Zählt belegte Pakete gruppiert nach Slot (Phase 3A)
     * 
     * Für Batch-Loading von occupiedCounts (N+1 vermeiden)
     * 
     * @param storeId Store ID
     * @param status Status (typisch STORED)
     * @param slotIds Liste von Slot-IDs
     * @return List<Object[]> mit [slotId, count]
     */
    @Query("SELECT p.shelfSlot.id, COUNT(p) FROM DhlParcel p " +
           "WHERE p.store.id = :storeId " +
           "AND p.status = :status " +
           "AND p.shelfSlot.id IN :slotIds " +
           "GROUP BY p.shelfSlot.id")
    List<Object[]> countByStoreIdAndStatusGroupedBySlot(
        @Param("storeId") Long storeId,
        @Param("status") DhlParcelStatus status,
        @Param("slotIds") List<Long> slotIds
    );
}

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
     * Findet Paket anhand Store + normalisiertem Tracking-Code
     * 
     * WICHTIG: Hauptmethode für Abholungen
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param trackingCode Normalisierter Tracking-Code
     * @return Optional<DhlParcel>
     */
    @Query("SELECT p FROM DhlParcel p WHERE p.store.id = :storeId AND p.trackingCode = :trackingCode")
    Optional<DhlParcel> findByStoreIdAndTrackingCode(
        @Param("storeId") Long storeId,
        @Param("trackingCode") String trackingCode
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
     * Listet alle Pakete eines Stores (alle Status)
     * 
     * @param storeId Store ID
     * @return List<DhlParcel>
     */
    @Query("SELECT p FROM DhlParcel p WHERE p.store.id = :storeId ORDER BY p.receivedAt DESC")
    List<DhlParcel> findByStoreId(@Param("storeId") Long storeId);
}

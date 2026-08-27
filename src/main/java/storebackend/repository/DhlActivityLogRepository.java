package storebackend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.DhlActivityLog;
import storebackend.enums.DhlActivityAction;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DHL Activity Log Repository
 * 
 * MULTI-TENANT SECURITY:
 * - Alle Queries MÜSSEN storeId in WHERE-Bedingung haben
 * - Keine Query ohne storeId-Filter
 * 
 * Phase 3A.2 - Audit Log
 */
@Repository
public interface DhlActivityLogRepository extends JpaRepository<DhlActivityLog, Long> {
    
    /**
     * Findet alle Aktivitäten für einen Store (mit Pagination)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param pageable Pagination
     * @return Seite mit Aktivitäten (neueste zuerst)
     */
    Page<DhlActivityLog> findByStoreIdOrderByCreatedAtDesc(Long storeId, Pageable pageable);
    
    /**
     * Findet Aktivitäten nach Action (mit Pagination)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param action Action (STORED, FOUND, PICKED_UP, SCAN_FAILED, MANUAL_SEARCH)
     * @param pageable Pagination
     * @return Seite mit gefilterten Aktivitäten
     */
    Page<DhlActivityLog> findByStoreIdAndActionOrderByCreatedAtDesc(
        Long storeId, 
        DhlActivityAction action, 
        Pageable pageable
    );
    
    /**
     * Findet Aktivitäten nach User (mit Pagination)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param userId User ID
     * @param pageable Pagination
     * @return Seite mit User-Aktivitäten
     */
    Page<DhlActivityLog> findByStoreIdAndUserIdOrderByCreatedAtDesc(
        Long storeId, 
        Long userId, 
        Pageable pageable
    );
    
    /**
     * Findet Aktivitäten nach Zeitraum (mit Pagination)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param fromDate Ab Datum/Zeit (inklusive)
     * @param pageable Pagination
     * @return Seite mit Aktivitäten im Zeitraum
     */
    Page<DhlActivityLog> findByStoreIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
        Long storeId, 
        LocalDateTime fromDate, 
        Pageable pageable
    );
    
    /**
     * Komplexe Filterung: Action + User + Zeitraum (mit Pagination)
     * 
     * Für Dashboard-Filter:
     * - Heute + bestimmte Action + bestimmter User
     * 
     * MULTI-TENANT: storeId ist IMMER gesetzt
     * Optionale Filter: action, userId, fromDate können null sein
     * 
     * @param storeId Store ID (Multi-Tenant, REQUIRED)
     * @param action Action (optional, null = alle)
     * @param userId User ID (optional, null = alle)
     * @param fromDate Ab Datum (optional, null = alle)
     * @param pageable Pagination
     * @return Seite mit gefilterten Aktivitäten
     */
    @Query("SELECT a FROM DhlActivityLog a " +
           "WHERE a.storeId = :storeId " +
           "AND (:action IS NULL OR a.action = :action) " +
           "AND (:userId IS NULL OR a.userId = :userId) " +
           "AND (:fromDate IS NULL OR a.createdAt >= :fromDate) " +
           "ORDER BY a.createdAt DESC")
    Page<DhlActivityLog> findByStoreIdWithFilters(
        @Param("storeId") Long storeId,
        @Param("action") DhlActivityAction action,
        @Param("userId") Long userId,
        @Param("fromDate") LocalDateTime fromDate,
        Pageable pageable
    );
    
    /**
     * Zählt Aktivitäten für einen Store (für Statistics)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @return Anzahl Aktivitäten
     */
    long countByStoreId(Long storeId);
    
    /**
     * Zählt Aktivitäten nach Action (für Statistics)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param action Action
     * @return Anzahl Aktivitäten mit dieser Action
     */
    long countByStoreIdAndAction(Long storeId, DhlActivityAction action);
    
    /**
     * Findet letzte N Aktivitäten für einen Store (für Dashboard-Widget)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param pageable Pagination (z.B. PageRequest.of(0, 10))
     * @return Liste der letzten N Aktivitäten
     */
    List<DhlActivityLog> findTop10ByStoreIdOrderByCreatedAtDesc(Long storeId);
}

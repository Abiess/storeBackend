package storebackend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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
 * Phase 3A.3 Fix - JpaSpecificationExecutor für dynamische Queries
 */
@Repository
public interface DhlActivityLogRepository extends JpaRepository<DhlActivityLog, Long>, JpaSpecificationExecutor<DhlActivityLog> {
    
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

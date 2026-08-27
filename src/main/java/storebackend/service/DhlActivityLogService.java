package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.DhlActivityLog;
import storebackend.entity.User;
import storebackend.enums.DhlActivityAction;
import storebackend.repository.DhlActivityLogRepository;
import storebackend.specification.DhlActivityLogSpecification;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DHL Activity Log Service
 * 
 * Protokolliert alle DHL-Paket-Aktionen mit Multi-Tenant-Sicherheit
 * 
 * SECURITY:
 * - User-Identität wird aus @AuthenticationPrincipal User extrahiert
 * - NIE userId oder E-Mail vom Frontend akzeptieren
 * - Alle Queries sind auf storeId begrenzt
 * 
 * PERFORMANCE:
 * - Verwendet separate Transaktionen (REQUIRES_NEW) um Hauptoperationen nicht zu blockieren
 * - Log-Fehler werden geloggt aber nicht geworfen (silent failure)
 * 
 * Phase 3A.2 - Audit Log
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlActivityLogService {
    
    private final DhlActivityLogRepository activityLogRepository;
    
    /**
     * Protokolliert eine DHL-Aktivität
     * 
     * WICHTIG: Verwendet separate Transaktion (REQUIRES_NEW)
     * damit Log-Fehler die Hauptoperation nicht beeinträchtigen
     * 
     * SECURITY: User-Identität aus authenticatedUser, NIE vom Frontend!
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param authenticatedUser Authentifizierter User aus @AuthenticationPrincipal
     * @param action Action (STORED, FOUND, PICKED_UP, SCAN_FAILED, MANUAL_SEARCH)
     * @param trackingCode Normalisierter Tracking-Code
     * @param parcelId Paket ID (optional, null bei SCAN_FAILED/MANUAL_SEARCH)
     * @param slotSnapshot Lagerplatz-Snapshot (optional)
     * @param durationMs Bearbeitungsdauer in ms (optional)
     * @param failureReason Fehlergrund bei fehlgeschlagenen Aktionen (optional)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logActivity(
        Long storeId,
        User authenticatedUser,
        DhlActivityAction action,
        String trackingCode,
        Long parcelId,
        String slotSnapshot,
        Long durationMs,
        String failureReason
    ) {
        try {
            // 1. Validierung
            if (storeId == null) {
                log.error("❌ Cannot log activity: storeId is null");
                return;
            }
            
            if (authenticatedUser == null) {
                log.error("❌ Cannot log activity: authenticatedUser is null for storeId={}", storeId);
                return;
            }
            
            if (trackingCode == null || trackingCode.isBlank()) {
                log.error("❌ Cannot log activity: trackingCode is empty for storeId={}", storeId);
                return;
            }
            
            // 2. User-Identität aus authenticatedUser extrahieren
            Long userId = authenticatedUser.getId();
            String userEmail = authenticatedUser.getEmail();
            
            if (userId == null) {
                log.error("❌ Cannot log activity: user has no ID for storeId={}, email={}", 
                    storeId, userEmail);
                return;
            }
            
            // 3. Activity Log erstellen
            DhlActivityLog activityLog = new DhlActivityLog();
            activityLog.setStoreId(storeId);
            activityLog.setParcelId(parcelId);
            activityLog.setTrackingCode(trackingCode);
            activityLog.setAction(action);
            activityLog.setSlotSnapshot(slotSnapshot);
            activityLog.setUserId(userId);
            activityLog.setUserEmail(userEmail != null ? userEmail : "unknown");
            activityLog.setDurationMs(durationMs);
            activityLog.setFailureReason(failureReason);
            activityLog.setCreatedAt(LocalDateTime.now());
            
            // 4. Speichern
            activityLogRepository.save(activityLog);
            
            this.log.debug("✅ DHL activity logged: storeId={}, userId={}, action={}, tracking={}, slot={}, duration={}ms, failureReason={}",
                storeId, userId, action, trackingCode, slotSnapshot, durationMs, failureReason);
            
        } catch (Exception e) {
            // Silent failure: Log-Fehler dürfen Hauptoperation nicht blockieren
            log.error("❌ Failed to log DHL activity: storeId={}, action={}, tracking={}, error={}",
                storeId, action, trackingCode, e.getMessage(), e);
        }
    }
    
    /**
     * Protokolliert erfolgreiche Einlagerung (STORED)
     * 
     * @param storeId Store ID
     * @param authenticatedUser Authentifizierter User
     * @param trackingCode Tracking-Code
     * @param parcelId Paket ID
     * @param slotSnapshot Lagerplatz (z.B. "A3")
     * @param durationMs Dauer von Scan bis Einlagerung (optional)
     */
    public void logStored(
        Long storeId,
        User authenticatedUser,
        String trackingCode,
        Long parcelId,
        String slotSnapshot,
        Long durationMs
    ) {
        logActivity(storeId, authenticatedUser, DhlActivityAction.STORED, 
            trackingCode, parcelId, slotSnapshot, durationMs, null);
    }
    
    /**
     * Protokolliert erfolgreiches Finden (FOUND)
     * 
     * @param storeId Store ID
     * @param authenticatedUser Authentifizierter User
     * @param trackingCode Tracking-Code
     * @param parcelId Paket ID
     * @param slotSnapshot Lagerplatz
     * @param durationMs Dauer von Suchanfrage bis Ergebnis (optional)
     */
    public void logFound(
        Long storeId,
        User authenticatedUser,
        String trackingCode,
        Long parcelId,
        String slotSnapshot,
        Long durationMs
    ) {
        logActivity(storeId, authenticatedUser, DhlActivityAction.FOUND, 
            trackingCode, parcelId, slotSnapshot, durationMs, null);
    }
    
    /**
     * Protokolliert erfolgreiche Abholung (PICKED_UP)
     * 
     * @param storeId Store ID
     * @param authenticatedUser Authentifizierter User
     * @param trackingCode Tracking-Code
     * @param parcelId Paket ID
     * @param slotSnapshot Lagerplatz
     * @param durationMs Dauer von Scan bis Abhol-Bestätigung (optional)
     */
    public void logPickedUp(
        Long storeId,
        User authenticatedUser,
        String trackingCode,
        Long parcelId,
        String slotSnapshot,
        Long durationMs
    ) {
        logActivity(storeId, authenticatedUser, DhlActivityAction.PICKED_UP, 
            trackingCode, parcelId, slotSnapshot, durationMs, null);
    }
    
    /**
     * Protokolliert fehlgeschlagenen Scan (SCAN_FAILED)
     * 
     * @param storeId Store ID
     * @param authenticatedUser Authentifizierter User
     * @param trackingCode Versuchter Tracking-Code (evtl. unleserlich)
     */
    public void logScanFailed(
        Long storeId,
        User authenticatedUser,
        String trackingCode
    ) {
        logActivity(storeId, authenticatedUser, DhlActivityAction.SCAN_FAILED, 
            trackingCode, null, null, null, null);
    }
    
    /**
     * Protokolliert fehlgeschlagenen Scan mit Fehlergrund (SCAN_FAILED)
     * Phase 3A.3 - Detaillierte Fehlerauditierung
     * 
     * @param storeId Store ID
     * @param authenticatedUser Authentifizierter User
     * @param trackingCode Versuchter Tracking-Code
     * @param failureReason Fehlergrund (z.B. PARCEL_ALREADY_PICKED_UP)
     */
    public void logScanFailedWithReason(
        Long storeId,
        User authenticatedUser,
        String trackingCode,
        String failureReason
    ) {
        logActivity(storeId, authenticatedUser, DhlActivityAction.SCAN_FAILED, 
            trackingCode, null, null, null, failureReason);
    }
    
    /**
     * Protokolliert manuelle Suche (MANUAL_SEARCH)
     * 
     * @param storeId Store ID
     * @param authenticatedUser Authentifizierter User
     * @param trackingCode Gesuchter Tracking-Code
     * @param durationMs Suchdauer (optional)
     */
    public void logManualSearch(
        Long storeId,
        User authenticatedUser,
        String trackingCode,
        Long durationMs
    ) {
        logActivity(storeId, authenticatedUser, DhlActivityAction.MANUAL_SEARCH, 
            trackingCode, null, null, durationMs, null);
    }
    
    /**
     * Protokolliert eine Paket-Stornierung (Phase 3A.4)
     * 
     * @param storeId Store ID
     * @param parcelId Parcel ID
     * @param trackingCode Tracking-Code
     * @param slotSnapshot Lagerplatz
     * @param userId User ID aus Spring Security
     * @param userEmail User E-Mail
     * @param cancellationReason Grund (WRONG_SCAN, etc.)
     * @param cancellationNote Optionale Notiz
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logStorageCancelled(
        Long storeId,
        Long parcelId,
        String trackingCode,
        String slotSnapshot,
        Long userId,
        String userEmail,
        String cancellationReason,
        String cancellationNote
    ) {
        try {
            DhlActivityLog activityLog = new DhlActivityLog();
            activityLog.setStoreId(storeId);
            activityLog.setParcelId(parcelId);
            activityLog.setTrackingCode(trackingCode);
            activityLog.setAction(DhlActivityAction.STORAGE_CANCELLED);
            activityLog.setSlotSnapshot(slotSnapshot);
            activityLog.setUserId(userId);
            activityLog.setUserEmail(userEmail);
            activityLog.setCancellationReason(cancellationReason);
            activityLog.setCancellationNote(cancellationNote);
            // durationMs bleibt null (keine Bearbeitungszeit bei Storno)
            
            activityLogRepository.save(activityLog);
            
            log.info("✅ Storage cancellation logged: storeId={}, tracking={}, reason={}, user={}", 
                storeId, trackingCode, cancellationReason, userEmail);
                
        } catch (Exception e) {
            // NICHT den Cancel-Vorgang blockieren, wenn Audit-Log fehlschlägt
            log.error("❌ Failed to log storage cancellation: storeId={}, tracking={}, error={}", 
                storeId, trackingCode, e.getMessage(), e);
        }
    }
    
    /**
     * Findet Aktivitäten mit Filtern (für Dashboard)
     * 
     * Phase 3A.3 Fix - Dynamic Queries mit JPA Specifications
     * 
     * MULTI-TENANT: storeId ist REQUIRED
     * Filter sind optional (null = ignoriert)
     * 
     * Vorher: Statische JPQL mit (:param IS NULL OR field = :param)
     * Problem: PostgreSQL kann Typ von nullable Parametern nicht bestimmen
     * 
     * Jetzt: Dynamische Specification - nur aktive Filter werden hinzugefügt
     * 
     * @param storeId Store ID (REQUIRED)
     * @param action Action-Filter (optional)
     * @param userId User-Filter (optional)
     * @param fromDate Zeitraum-Filter (optional)
     * @param pageable Pagination
     * @return Seite mit Aktivitäten
     */
    @Transactional(readOnly = true)
    public Page<DhlActivityLog> findWithFilters(
        Long storeId,
        DhlActivityAction action,
        Long userId,
        LocalDateTime fromDate,
        Pageable pageable
    ) {
        if (storeId == null) {
            throw new IllegalArgumentException("storeId is required");
        }
        
        // Dynamische Specification basierend auf aktiven Filtern
        Specification<DhlActivityLog> spec = DhlActivityLogSpecification.buildSpecification(
            storeId, action, userId, fromDate
        );
        
        log.debug("🔍 Activity Log query: storeId={}, action={}, userId={}, fromDate={}", 
            storeId, action, userId, fromDate);
        
        return activityLogRepository.findAll(spec, pageable);
    }
    
    /**
     * Findet letzte N Aktivitäten (für Dashboard-Widget)
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param limit Max. Anzahl (typisch 10)
     * @return Liste der letzten Aktivitäten
     */
    @Transactional(readOnly = true)
    public List<DhlActivityLog> findLatest(Long storeId) {
        if (storeId == null) {
            throw new IllegalArgumentException("storeId is required");
        }
        
        return activityLogRepository.findTop10ByStoreIdOrderByCreatedAtDesc(storeId);
    }
    
    /**
     * Zählt Aktivitäten nach Action (für Statistics)
     * 
     * @param storeId Store ID
     * @param action Action
     * @return Anzahl
     */
    @Transactional(readOnly = true)
    public long countByAction(Long storeId, DhlActivityAction action) {
        if (storeId == null) {
            return 0;
        }
        
        return activityLogRepository.countByStoreIdAndAction(storeId, action);
    }
}

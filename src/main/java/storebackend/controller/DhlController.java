package storebackend.controller;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.*;
import storebackend.entity.DhlParcel;
import storebackend.entity.User;
import storebackend.service.DhlParcelService;
import storebackend.service.DhlActivityLogService;
import storebackend.util.StoreAccessChecker;
import storebackend.exception.*;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * DHL Parcel Controller
 * 
 * REST API für DHL-Paket-Verwaltung (Phase 1)
 * 
 * Endpoints:
 * - POST   /api/stores/{storeId}/dhl/parcels/store   → Paket einlagern
 * - POST   /api/stores/{storeId}/dhl/parcels/find    → Paket suchen
 * - POST   /api/stores/{storeId}/dhl/parcels/pickup  → Paket abholen
 * - GET    /api/stores/{storeId}/dhl/parcels         → Alle Pakete listen
 * - GET    /api/stores/{storeId}/dhl/parcels/stored  → Nur eingelagerte Pakete
 * - GET    /api/stores/{storeId}/dhl/parcels/count   → Anzahl eingelagerter Pakete
 * 
 * SECURITY:
 * - Multi-Tenant: storeId validation via StoreAccessChecker
 * - RBAC: Verwendet bestehende Store-Permissions
 * - Phase 1: Keine neue DHL-spezifische Permission
 * 
 * PHASE 1 SCOPE:
 * - Kein DHL API Call
 * - Keine automatische Tracking-Status-Abfrage
 * - Keine SMS/E-Mail Benachrichtigung
 * - Keine Unterschrift/Ausweis
 */
@RestController
@RequestMapping("/api/stores/{storeId}/dhl")
@RequiredArgsConstructor
@Slf4j
public class DhlController {
    
    private final DhlParcelService parcelService;
    private final DhlActivityLogService activityLogService;
    private final StoreAccessChecker storeAccessChecker;

    /**
     * POST /api/stores/{storeId}/dhl/parcels/store
     * 
     * Lagert Paket ein (Phase 1 + Phase 2)
     * 
     * Phase 1 Request:
     * {
     *   "trackingCode": "jvgl 0605 3797 0051 8040",
     *   "shelfLocation": "Regal B-12",
     *   "notes": "Optional"
     * }
     * 
     * Phase 2 Request (AUTO):
     * {
     *   "trackingCode": "JVGL0605379700518040",
     *   "mode": "auto",
     *   "notes": "Optional"
     * }
     * 
     * Phase 2 Request (MANUAL):
     * {
     *   "trackingCode": "JVGL0605379700518040",
     *   "mode": "manual",
     *   "slotCode": "A3",
     *   "notes": "Optional"
     * }
     * 
     * Response:
     * {
     *   "id": 1,
     *   "storeId": 5,
     *   "trackingCode": "JVGL0605379700518040",
     *   "shelfLocation": "A3",
     *   "receivedAt": "2026-08-26T14:30:00",
     *   "status": "STORED",
     *   ...
     * }
     * 
     * Errors:
     * - 401: Not authenticated
     * - 403: No access to store
     * - 400: Invalid tracking code or duplicate
     */
    @PostMapping("/parcels/store")
    public ResponseEntity<?> storeParcel(
        @PathVariable Long storeId,
        @RequestBody java.util.Map<String, Object> rawRequest,
        @AuthenticationPrincipal User user
    ) {
        try {
            // 1. Authentication Check
            if (user == null) {
                log.warn("DHL store parcel denied: User not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
            }

            // 2. Store Access Check (Multi-Tenant)
            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                log.warn("DHL store parcel denied: user={} has no access to store={}", 
                    user.getId(), storeId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied to store");
            }

            // 3. Extract common fields
            String trackingCode = (String) rawRequest.get("trackingCode");
            String notes = (String) rawRequest.get("notes");
            
            if (trackingCode == null || trackingCode.isBlank()) {
                return ResponseEntity.badRequest().body("Tracking code is required");
            }

            // 4. Determine request type and validate accordingly
            String mode = (String) rawRequest.get("mode");
            DhlParcel parcel;
            
            if (mode != null) {
                // Phase 2: Mode-based request
                if ("auto".equalsIgnoreCase(mode)) {
                    // AUTO: Backend allocates slot
                    parcel = parcelService.storeParcel(
                        storeId,
                        trackingCode,
                        "auto",
                        null,
                        null, // shelfLocation not needed
                        notes
                    );
                    log.info("✅ DHL parcel stored (AUTO): user={}, store={}, tracking={}, slot={}", 
                        user.getId(), storeId, parcel.getTrackingCode(), parcel.getShelfLocation());
                    
                } else if ("manual".equalsIgnoreCase(mode)) {
                    // MANUAL: User selects slot
                    String slotCode = (String) rawRequest.get("slotCode");
                    if (slotCode == null || slotCode.isBlank()) {
                        return ResponseEntity.badRequest().body("Slot code is required for manual mode");
                    }
                    
                    parcel = parcelService.storeParcel(
                        storeId,
                        trackingCode,
                        "manual",
                        slotCode,
                        null, // shelfLocation derived from slot
                        notes
                    );
                    log.info("✅ DHL parcel stored (MANUAL): user={}, store={}, tracking={}, slot={}", 
                        user.getId(), storeId, parcel.getTrackingCode(), slotCode);
                    
                } else {
                    return ResponseEntity.badRequest().body("Invalid mode: " + mode + ". Use 'auto' or 'manual'");
                }
                
            } else {
                // Phase 1: Legacy request with shelfLocation
                String shelfLocation = (String) rawRequest.get("shelfLocation");
                if (shelfLocation == null || shelfLocation.isBlank()) {
                    return ResponseEntity.badRequest().body("Shelf location is required for legacy mode");
                }
                
                parcel = parcelService.storeParcel(
                    storeId,
                    trackingCode,
                    null,
                    null,
                    shelfLocation,
                    notes
                );
                log.info("✅ DHL parcel stored (LEGACY): user={}, store={}, tracking={}, location={}", 
                    user.getId(), storeId, parcel.getTrackingCode(), shelfLocation);
            }

            DhlParcelResponse response = DhlParcelResponse.fromEntity(parcel);
            
            // 6. AUDIT LOG: Successful storage
            activityLogService.logStored(
                storeId, 
                user, 
                parcel.getTrackingCode(), 
                parcel.getId(), 
                parcel.getShelfLocation(), 
                null // duration not tracked in Phase 3A.2
            );
            
            return ResponseEntity.ok(response);

        } catch (ParcelAlreadyStoredException | InvalidTrackingCodeException | SlotFullException | NoFreeSlotException e) {
            // Fachliche Fehler mit Audit-Logging (Phase 3A.3)
            String trackingCode = (String) rawRequest.get("trackingCode");
            if (trackingCode != null && !trackingCode.isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(trackingCode);
                    activityLogService.logScanFailedWithReason(storeId, user, normalized, 
                        e instanceof DhlParcelException ? ((DhlParcelException) e).getCode() : "UNKNOWN");
                } catch (Exception logEx) {
                    log.debug("Could not log scan failure: {}", logEx.getMessage());
                }
            }
            // GlobalExceptionHandler behandelt die Response
            throw e;
            
        } catch (IllegalArgumentException e) {
            log.warn("DHL store parcel failed: {}", e.getMessage());
            
            // Legacy: Allgemeine Validierungsfehler
            String trackingCode = (String) rawRequest.get("trackingCode");
            if (trackingCode != null && !trackingCode.isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(trackingCode);
                    activityLogService.logScanFailed(storeId, user, normalized);
                } catch (Exception logEx) {
                    log.debug("Could not log scan failure: {}", logEx.getMessage());
                }
            }
            
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("DHL store parcel error", e);
            return ResponseEntity.internalServerError().body("Internal server error");
        }
    }

    /**
     * POST /api/stores/{storeId}/dhl/parcels/find
     * 
     * Sucht Paket anhand Tracking-Code
     * 
     * Request:
     * {
     *   "trackingCode": "(J)VGL0605379700518040"
     * }
     * 
     * Response:
     * - 200: Parcel found (DhlParcelResponse)
     * - 404: Parcel not found
     */
    @PostMapping("/parcels/find")
    public ResponseEntity<?> findParcel(
        @PathVariable Long storeId,
        @RequestBody DhlFindParcelRequest request,
        @AuthenticationPrincipal User user
    ) {
        try {
            // 1. Authentication Check
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
            }

            // 2. Store Access Check
            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied to store");
            }

            // 3. Validation
            if (request.getTrackingCode() == null || request.getTrackingCode().isBlank()) {
                return ResponseEntity.badRequest().body("Tracking code is required");
            }

            // 4. Find Parcel
            Optional<DhlParcel> parcelOpt = parcelService.findParcel(storeId, request.getTrackingCode());
            
            if (parcelOpt.isPresent()) {
                DhlParcel parcel = parcelOpt.get();
                
                // AUDIT LOG: Successful find
                activityLogService.logFound(
                    storeId, 
                    user, 
                    parcel.getTrackingCode(), 
                    parcel.getId(), 
                    parcel.getShelfLocation(), 
                    null
                );
                
                return ResponseEntity.ok(DhlParcelResponse.fromEntity(parcel));
            } else {
                // AUDIT LOG: Manual search (not found)
                String normalized = parcelService.normalizeTrackingCode(request.getTrackingCode());
                activityLogService.logManualSearch(storeId, user, normalized, null);
                
                return ResponseEntity.notFound().build();
            }

        } catch (IllegalArgumentException e) {
            // AUDIT LOG: Failed scan
            if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(request.getTrackingCode());
                    activityLogService.logScanFailed(storeId, user, normalized);
                } catch (Exception logEx) {
                    log.debug("Could not log scan failure: {}", logEx.getMessage());
                }
            }
            
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("DHL find parcel error", e);
            return ResponseEntity.internalServerError().body("Internal server error");
        }
    }

    /**
     * POST /api/stores/{storeId}/dhl/parcels/pickup
     * 
     * Holt Paket ab (markiert als PICKED_UP)
     * 
     * Request:
     * {
     *   "trackingCode": "JVGL0605379700518040"
     * }
     * 
     * Response:
     * - 200: Pickup successful (DhlParcelResponse with pickedUpAt + status=PICKED_UP)
     * - 400: Invalid code or already picked up
     * - 404: Parcel not found
     */
    @PostMapping("/parcels/pickup")
    public ResponseEntity<?> pickupParcel(
        @PathVariable Long storeId,
        @RequestBody DhlPickupParcelRequest request,
        @AuthenticationPrincipal User user
    ) {
        try {
            // 1. Authentication Check
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
            }

            // 2. Store Access Check
            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied to store");
            }

            // 3. Validation
            if (request.getTrackingCode() == null || request.getTrackingCode().isBlank()) {
                return ResponseEntity.badRequest().body("Tracking code is required");
            }

            // 4. Pickup Parcel
            DhlParcel parcel = parcelService.pickupParcel(storeId, request.getTrackingCode());
            DhlParcelResponse response = DhlParcelResponse.fromEntity(parcel);

            log.info("✅ DHL parcel picked up: user={}, store={}, tracking={}", 
                user.getId(), storeId, response.getTrackingCode());
            
            // 5. AUDIT LOG: Successful pickup
            activityLogService.logPickedUp(
                storeId, 
                user, 
                parcel.getTrackingCode(), 
                parcel.getId(), 
                parcel.getShelfLocation(), 
                null
            );
            
            return ResponseEntity.ok(response);

        } catch (ParcelNotFoundException | ParcelAlreadyPickedUpException | InvalidTrackingCodeException e) {
            // Fachliche Fehler mit Audit-Logging (Phase 3A.3)
            if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(request.getTrackingCode());
                    activityLogService.logScanFailedWithReason(storeId, user, normalized, 
                        e instanceof DhlParcelException ? ((DhlParcelException) e).getCode() : "UNKNOWN");
                } catch (Exception logEx) {
                    log.debug("Could not log scan failure: {}", logEx.getMessage());
                }
            }
            // GlobalExceptionHandler behandelt die Response
            throw e;
            
        } catch (IllegalArgumentException e) {
            log.warn("DHL pickup failed: {}", e.getMessage());
            
            // Legacy: Allgemeine Validierungsfehler
            if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(request.getTrackingCode());
                    activityLogService.logScanFailed(storeId, user, normalized);
                } catch (Exception logEx) {
                    log.debug("Could not log scan failure: {}", logEx.getMessage());
                }
            }
            
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("DHL pickup parcel error", e);
            return ResponseEntity.internalServerError().body("Internal server error");
        }
    }

    /**
     * GET /api/stores/{storeId}/dhl/parcels
     * 
     * Listet alle Pakete (alle Status)
     * 
     * Response:
     * [
     *   { "id": 1, "trackingCode": "...", "status": "STORED", ... },
     *   { "id": 2, "trackingCode": "...", "status": "PICKED_UP", ... }
     * ]
     */
    @GetMapping("/parcels")
    public ResponseEntity<?> listAllParcels(
        @PathVariable Long storeId,
        @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            List<DhlParcelResponse> parcels = parcelService.listAllParcels(storeId)
                .stream()
                .map(DhlParcelResponse::fromEntity)
                .collect(Collectors.toList());

            return ResponseEntity.ok(parcels);

        } catch (Exception e) {
            log.error("DHL list parcels error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * GET /api/stores/{storeId}/dhl/parcels/stored
     * 
     * Listet nur eingelagerte Pakete (status = STORED)
     * 
     * Für UI-Liste der wartenden Pakete
     */
    @GetMapping("/parcels/stored")
    public ResponseEntity<?> listStoredParcels(
        @PathVariable Long storeId,
        @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            List<DhlParcelResponse> parcels = parcelService.listStoredParcels(storeId)
                .stream()
                .map(DhlParcelResponse::fromEntity)
                .collect(Collectors.toList());

            return ResponseEntity.ok(parcels);

        } catch (Exception e) {
            log.error("DHL list stored parcels error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * GET /api/stores/{storeId}/dhl/parcels/count
     * 
     * Zählt eingelagerte Pakete (status = STORED)
     * 
     * Response:
     * {
     *   "count": 7
     * }
     * 
     * Für Badge in Sidebar
     */
    @GetMapping("/parcels/count")
    public ResponseEntity<?> countStoredParcels(
        @PathVariable Long storeId,
        @AuthenticationPrincipal User user
    ) {
        try {
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            long count = parcelService.countStoredParcels(storeId);
            return ResponseEntity.ok(new CountResponse(count));

        } catch (Exception e) {
            log.error("DHL count parcels error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Helper class for count response
     */
    @Data
    @AllArgsConstructor
    private static class CountResponse {
        private long count;
    }
    
    /**
     * GET /api/stores/{storeId}/dhl/activity-log
     * 
     * Listet DHL-Aktivitäten mit optionalen Filtern
     * 
     * Query-Parameter:
     * - today: boolean (nur heute, default=false)
     * - action: DhlActivityAction (optional)
     * - userId: Long (optional)
     * - page: int (default=0)
     * - size: int (default=20, max=100)
     * 
     * Response:
     * {
     *   "content": [ { "id": 1, "action": "STORED", ... } ],
     *   "totalElements": 42,
     *   "totalPages": 3,
     *   "number": 0,
     *   "size": 20
     * }
     * 
     * Für Dashboard-Widget: Filter auf heute + limit 10
     */
    @GetMapping("/activity-log")
    public ResponseEntity<?> getActivityLog(
        @PathVariable Long storeId,
        @RequestParam(required = false) Boolean today,
        @RequestParam(required = false) storebackend.enums.DhlActivityAction action,
        @RequestParam(required = false) Long userId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @AuthenticationPrincipal User user
    ) {
        try {
            // 1. Authentication Check
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // 2. Store Access Check
            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            // 3. Size Limit
            if (size > 100) {
                size = 100;
            }

            // 4. Zeitraum-Filter
            java.time.LocalDateTime fromDate = null;
            if (today != null && today) {
                fromDate = java.time.LocalDateTime.now().toLocalDate().atStartOfDay();
            }

            // 5. Pagination
            org.springframework.data.domain.Pageable pageable = 
                org.springframework.data.domain.PageRequest.of(page, size);

            // 6. Query mit Filtern
            org.springframework.data.domain.Page<storebackend.entity.DhlActivityLog> activityPage = 
                activityLogService.findWithFilters(storeId, action, userId, fromDate, pageable);

            // 7. DTO Mapping
            org.springframework.data.domain.Page<DhlActivityLogResponse> responsePage = 
                activityPage.map(DhlActivityLogResponse::fromEntity);

            return ResponseEntity.ok(responsePage);

        } catch (Exception e) {
            log.error("DHL activity log error", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}


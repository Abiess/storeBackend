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
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.concurrent.TimeUnit;

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
    private final storebackend.service.dhl.DhlTrackingClient dhlTrackingClient;

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
        // Start duration tracking
        long startNanos = System.nanoTime();
        
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

            // 3b. AUTHORITATIVE DHL VALIDATION (Sicherheits-Fix)
            //
            // Das Backend ist die verbindliche Sicherheitsinstanz: Ein Frontend-Aufruf von
            // /tracking/validate ist reine UX-Vorprüfung und darf NICHT die einzige Kontrolle sein.
            // Deshalb MUSS hier - VOR jeder irreversiblen Änderung (Slot-Reservierung, DB-Insert,
            // Aktivitäts-Log "Eingelagert") - erneut gegen die DHL Tracking API validiert werden.
            // Fail closed: nur status == VALID darf zur Persistierung führen.
            storebackend.dto.dhl.DhlTrackingValidationResult trackingValidation;
            try {
                trackingValidation = dhlTrackingClient.validateTrackingCode(storeId, trackingCode);
            } catch (storebackend.exception.DhlTrackingException e) {
                // Technischer/authentifizierungsbedingter DHL-Fehler → NICHT speichern (fail closed)
                log.error("❌ DHL store parcel denied: DHL validation error, store={}, trackingCode={}, errorCode={}, message={}",
                    storeId, trackingCode, e.getErrorCode(), e.getMessage());
                logStoreValidationFailure(storeId, user, trackingCode, "DHL_" + e.getErrorCode().name(), startNanos);

                HttpStatus status;
                switch (e.getErrorCode()) {
                    case AUTHENTICATION_ERROR:
                        status = HttpStatus.SERVICE_UNAVAILABLE;
                        break;
                    case CONNECTIVITY_ERROR:
                        status = HttpStatus.GATEWAY_TIMEOUT;
                        break;
                    case DHL_TECHNICAL_ERROR:
                    case UNKNOWN_DHL_ERROR:
                    case XML_PARSING_ERROR:
                    case HTTP_ERROR:
                    default:
                        status = HttpStatus.INTERNAL_SERVER_ERROR;
                        break;
                }

                return ResponseEntity.status(status).body(Map.of(
                    "error", "DHL tracking validation failed",
                    "code", "DHL_" + e.getErrorCode().name(),
                    "messageKey", e.getMessageKey(),
                    "message", e.getMessage()
                ));
            } catch (storebackend.exception.DhlConfigurationException e) {
                // DHL nicht konfiguriert → NICHT speichern (fail closed)
                log.error("❌ DHL store parcel denied: DHL not configured, store={}", storeId);
                logStoreValidationFailure(storeId, user, trackingCode, "DHL_NOT_CONFIGURED", startNanos);

                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "DHL integration not configured",
                    "code", "DHL_NOT_CONFIGURED",
                    "messageKey", e.getMessageKey(),
                    "message", e.getMessage()
                ));
            }

            if (trackingValidation.getStatus() != storebackend.dto.dhl.DhlTrackingValidationResult.DhlTrackingValidationStatus.VALID) {
                // NOT_FOUND: kein technischer Fehler, aber ebenfalls KEINE Einlagerung erlaubt
                log.warn("⚠️ DHL store parcel denied: tracking code not confirmed by DHL (NOT_FOUND), store={}, trackingCode={}",
                    storeId, trackingCode);
                logStoreValidationFailure(storeId, user, trackingCode, "DHL_TRACKING_NOT_FOUND", startNanos);

                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of(
                    "error", "DHL shipment not found",
                    "code", "DHL_TRACKING_NOT_FOUND",
                    "message", "Keine gültige DHL-Sendung gefunden."
                ));
            }

            // Kanonischen, von DHL bestätigten pieceCode bevorzugen (statt blind dem Client-Wert zu vertrauen)
            String validatedTrackingCode = (trackingValidation.getPieceCode() != null && !trackingValidation.getPieceCode().isBlank())
                ? trackingValidation.getPieceCode()
                : trackingCode;

            log.info("✅ DHL tracking code confirmed VALID by DHL API: store={}, trackingCode={}, pieceCode={}",
                storeId, trackingCode, validatedTrackingCode);

            // 4. Determine request type and validate accordingly
            String mode = (String) rawRequest.get("mode");
            DhlParcel parcel;
            
            if (mode != null) {
                // Phase 2: Mode-based request
                if ("auto".equalsIgnoreCase(mode)) {
                    // AUTO: Backend allocates slot
                    parcel = parcelService.storeParcel(
                        storeId,
                        validatedTrackingCode,
                        "auto",
                        null,
                        null, // shelfLocation not needed
                        notes,
                        trackingValidation
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
                        validatedTrackingCode,
                        "manual",
                        slotCode,
                        null, // shelfLocation derived from slot
                        notes,
                        trackingValidation
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
                    validatedTrackingCode,
                    null,
                    null,
                    shelfLocation,
                    notes,
                    trackingValidation
                );
                log.info("✅ DHL parcel stored (LEGACY): user={}, store={}, tracking={}, location={}", 
                    user.getId(), storeId, parcel.getTrackingCode(), shelfLocation);
            }

            DhlParcelResponse response = DhlParcelResponse.fromEntity(parcel);
            
            // 6. AUDIT LOG: Successful storage
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            activityLogService.logStored(
                storeId, 
                user, 
                parcel.getTrackingCode(), 
                parcel.getId(), 
                parcel.getShelfLocation(), 
                durationMs
            );
            
            return ResponseEntity.ok(response);

        } catch (ParcelAlreadyStoredException | InvalidTrackingCodeException | SlotFullException | NoFreeSlotException e) {
            // Fachliche Fehler mit Audit-Logging (Phase 3A.3)
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            String trackingCode = (String) rawRequest.get("trackingCode");
            if (trackingCode != null && !trackingCode.isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(trackingCode);
                    activityLogService.logScanFailedWithReason(storeId, user, normalized, 
                        e instanceof DhlParcelException ? ((DhlParcelException) e).getCode() : "UNKNOWN",
                        durationMs);
                } catch (Exception logEx) {
                    log.debug("Could not log scan failure: {}", logEx.getMessage());
                }
            }
            // GlobalExceptionHandler behandelt die Response
            throw e;
            
        } catch (IllegalArgumentException e) {
            log.warn("DHL store parcel failed: {}", e.getMessage());
            
            // Legacy: Allgemeine Validierungsfehler
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            String trackingCode = (String) rawRequest.get("trackingCode");
            if (trackingCode != null && !trackingCode.isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(trackingCode);
                    activityLogService.logScanFailed(storeId, user, normalized, durationMs);
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
     * Protokolliert einen fehlgeschlagenen Einlagerungsversuch, der bereits an der
     * (erneuten, backend-seitigen) DHL-Tracking-Validierung gescheitert ist - also
     * BEVOR ein Slot reserviert oder ein Paket persistiert wurde.
     *
     * Best-effort: Ein Fehler beim Logging darf den bereits feststehenden Abbruch
     * der Einlagerung nicht verändern.
     */
    private void logStoreValidationFailure(Long storeId, User user, String rawTrackingCode, String failureReason, long startNanos) {
        if (user == null || rawTrackingCode == null || rawTrackingCode.isBlank()) {
            return;
        }
        try {
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            String loggedCode;
            try {
                loggedCode = parcelService.normalizeTrackingCode(rawTrackingCode);
            } catch (Exception normalizeEx) {
                loggedCode = rawTrackingCode.trim();
            }
            activityLogService.logScanFailedWithReason(storeId, user, loggedCode, failureReason, durationMs);
        } catch (Exception logEx) {
            log.debug("Could not log DHL validation failure: {}", logEx.getMessage());
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
        // Start duration tracking
        long startNanos = System.nanoTime();
        
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
                long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
                activityLogService.logFound(
                    storeId, 
                    user, 
                    parcel.getTrackingCode(), 
                    parcel.getId(), 
                    parcel.getShelfLocation(), 
                    durationMs
                );
                
                return ResponseEntity.ok(DhlParcelResponse.fromEntity(parcel));
            } else {
                // AUDIT LOG: Manual search (not found)
                long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
                String normalized = parcelService.normalizeTrackingCode(request.getTrackingCode());
                activityLogService.logManualSearch(storeId, user, normalized, durationMs);
                
                return ResponseEntity.notFound().build();
            }

        } catch (IllegalArgumentException e) {
            // AUDIT LOG: Failed scan
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(request.getTrackingCode());
                    activityLogService.logScanFailed(storeId, user, normalized, durationMs);
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
     * SECURITY (Teil C):
     * Wie bei /parcels/store ist das Backend die verbindliche Sicherheitsinstanz.
     * Ein Frontend-Aufruf von /tracking/validate ist reine UX-Vorprüfung. Deshalb
     * MUSS auch hier - VOR dem irreversiblen Setzen von status=PICKED_UP - erneut
     * gegen die DHL Tracking API validiert werden. Fail closed: nur status == VALID
     * darf zur Abholung führen. Ein direkter curl/Postman-Aufruf kann diese Prüfung
     * NICHT umgehen.
     * 
     * Response:
     * - 200: Pickup successful (DhlParcelResponse with pickedUpAt + status=PICKED_UP)
     * - 400: Invalid code or already picked up
     * - 404: Parcel not found
     * - 422: DHL shipment not found (DHL_TRACKING_NOT_FOUND)
     * - 503/504/500: Technische DHL-Fehler (fail closed, keine Abholung)
     */
    @PostMapping("/parcels/pickup")
    public ResponseEntity<?> pickupParcel(
        @PathVariable Long storeId,
        @RequestBody DhlPickupParcelRequest request,
        @AuthenticationPrincipal User user
    ) {
        // Start duration tracking
        long startNanos = System.nanoTime();
        
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

            String trackingCode = request.getTrackingCode();

            // 3b. AUTHORITATIVE DHL VALIDATION (Teil C - fail closed, wie bei /parcels/store)
            storebackend.dto.dhl.DhlTrackingValidationResult trackingValidation;
            try {
                trackingValidation = dhlTrackingClient.validateTrackingCode(storeId, trackingCode);
            } catch (storebackend.exception.DhlTrackingException e) {
                log.error("❌ DHL pickup denied: DHL validation error, store={}, trackingCode={}, errorCode={}, message={}",
                    storeId, trackingCode, e.getErrorCode(), e.getMessage());
                logStoreValidationFailure(storeId, user, trackingCode, "DHL_" + e.getErrorCode().name(), startNanos);

                HttpStatus status;
                switch (e.getErrorCode()) {
                    case AUTHENTICATION_ERROR:
                        status = HttpStatus.SERVICE_UNAVAILABLE;
                        break;
                    case CONNECTIVITY_ERROR:
                        status = HttpStatus.GATEWAY_TIMEOUT;
                        break;
                    case DHL_TECHNICAL_ERROR:
                    case UNKNOWN_DHL_ERROR:
                    case XML_PARSING_ERROR:
                    case HTTP_ERROR:
                    default:
                        status = HttpStatus.INTERNAL_SERVER_ERROR;
                        break;
                }

                return ResponseEntity.status(status).body(Map.of(
                    "error", "DHL tracking validation failed",
                    "code", "DHL_" + e.getErrorCode().name(),
                    "messageKey", e.getMessageKey(),
                    "message", e.getMessage()
                ));
            } catch (storebackend.exception.DhlConfigurationException e) {
                log.error("❌ DHL pickup denied: DHL not configured, store={}", storeId);
                logStoreValidationFailure(storeId, user, trackingCode, "DHL_NOT_CONFIGURED", startNanos);

                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                    "error", "DHL integration not configured",
                    "code", "DHL_NOT_CONFIGURED",
                    "messageKey", e.getMessageKey(),
                    "message", e.getMessage()
                ));
            }

            if (trackingValidation.getStatus() != storebackend.dto.dhl.DhlTrackingValidationResult.DhlTrackingValidationStatus.VALID) {
                log.warn("⚠️ DHL pickup denied: tracking code not confirmed by DHL (NOT_FOUND), store={}, trackingCode={}",
                    storeId, trackingCode);
                logStoreValidationFailure(storeId, user, trackingCode, "DHL_TRACKING_NOT_FOUND", startNanos);

                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(Map.of(
                    "error", "DHL shipment not found",
                    "code", "DHL_TRACKING_NOT_FOUND",
                    "message", "Keine gültige DHL-Sendung gefunden."
                ));
            }

            // Kanonischen, von DHL bestätigten pieceCode bevorzugen für die lokale Suche
            // (analog zu /parcels/store) - nicht blind dem Client-Wert vertrauen.
            String validatedTrackingCode = (trackingValidation.getPieceCode() != null && !trackingValidation.getPieceCode().isBlank())
                ? trackingValidation.getPieceCode()
                : trackingCode;

            log.info("✅ DHL tracking code confirmed VALID by DHL API for pickup: store={}, trackingCode={}, pieceCode={}",
                storeId, trackingCode, validatedTrackingCode);

            // 4. Pickup Parcel - lokale Suche mit dem von DHL bestätigten (kanonischen) Code
            DhlParcel parcel = parcelService.pickupParcel(storeId, validatedTrackingCode);
            DhlParcelResponse response = DhlParcelResponse.fromEntity(parcel);

            log.info("✅ DHL parcel picked up: user={}, store={}, tracking={}", 
                user.getId(), storeId, response.getTrackingCode());
            
            // 5. AUDIT LOG: Successful pickup
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            activityLogService.logPickedUp(
                storeId, 
                user, 
                parcel.getTrackingCode(), 
                parcel.getId(), 
                parcel.getShelfLocation(), 
                durationMs
            );
            
            return ResponseEntity.ok(response);

        } catch (ParcelNotFoundException | ParcelAlreadyPickedUpException | InvalidTrackingCodeException e) {
            // Fachliche Fehler mit Audit-Logging (Phase 3A.3)
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(request.getTrackingCode());
                    activityLogService.logScanFailedWithReason(storeId, user, normalized, 
                        e instanceof DhlParcelException ? ((DhlParcelException) e).getCode() : "UNKNOWN",
                        durationMs);
                } catch (Exception logEx) {
                    log.debug("Could not log scan failure: {}", logEx.getMessage());
                }
            }
            // GlobalExceptionHandler behandelt die Response
            throw e;
            
        } catch (IllegalArgumentException e) {
            log.warn("DHL pickup failed: {}", e.getMessage());
            
            // Legacy: Allgemeine Validierungsfehler
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            if (request.getTrackingCode() != null && !request.getTrackingCode().isBlank() && user != null) {
                try {
                    String normalized = parcelService.normalizeTrackingCode(request.getTrackingCode());
                    activityLogService.logScanFailed(storeId, user, normalized, durationMs);
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
    
    /**
     * Storniert eine fehlerhafte Paket-Einlagerung
     * 
     * Phase 3A.4 - Paket-Korrektur
     * 
     * POST /api/stores/{storeId}/dhl/parcels/{parcelId}/cancel
     * 
     * Request Body:
     * {
     *   "reason": "TEST_SCAN",
     *   "note": "optional"
     * }
     * 
     * SECURITY:
     * - StoreAccessChecker validiert Zugriff
     * - Multi-Tenant: parcelRepository.findByStoreIdAndId()
     * - User aus @AuthenticationPrincipal
     * 
     * VALIDIERUNG:
     * - Paket muss STORED sein
     * - reason ist required
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param parcelId Parcel ID
     * @param request CancelParcelRequest mit reason + note
     * @param user Authentifizierter User aus Spring Security Context
     * @return DhlParcel mit Status CANCELLED
     */
    @PostMapping("/parcels/{parcelId}/cancel")
    public ResponseEntity<DhlParcel> cancelParcel(
        @PathVariable Long storeId,
        @PathVariable Long parcelId,
        @RequestBody CancelParcelRequest request,
        @AuthenticationPrincipal User user
    ) {
        // Start duration tracking
        long startNanos = System.nanoTime();
        
        log.info("📋 Cancel parcel request: storeId={}, parcelId={}, reason={}, user={}", 
            storeId, parcelId, request.getReason(), user != null ? user.getEmail() : "null");
        
        try {
            // 1. Store Access Check
            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                log.warn("⚠️ Access denied: user={}, storeId={}", 
                    user != null ? user.getEmail() : "null", storeId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            
            // 2. Validierung: reason required
            if (request.getReason() == null) {
                throw new IllegalArgumentException("Cancellation reason is required");
            }
            
            // 3. User-Identität aus Security Context
            Long userId = user != null ? user.getId() : null;
            String userEmail = user != null ? user.getEmail() : "unknown";
            
            if (userId == null) {
                log.error("❌ User ID is null - authentication issue");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            // 4. Parcel stornieren (Service prüft Multi-Tenant + Status)
            DhlParcel cancelledParcel = parcelService.cancelParcel(
                storeId, 
                parcelId,
                request.getReason().name(),
                request.getNote(),
                userId,
                userEmail
            );
            
            // 5. Activity Log: STORAGE_CANCELLED
            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            activityLogService.logStorageCancelled(
                storeId,
                cancelledParcel.getId(),
                cancelledParcel.getTrackingCode(),
                cancelledParcel.getShelfLocation(),
                userId,
                userEmail,
                request.getReason().name(),
                request.getNote(),
                durationMs
            );
            
            log.info("✅ Parcel cancellation successful: id={}, tracking={}, user={}", 
                cancelledParcel.getId(), cancelledParcel.getTrackingCode(), userEmail);
            
            return ResponseEntity.ok(cancelledParcel);
            
        } catch (ParcelNotFoundException | ParcelNotStoredException | ParcelAlreadyCancelledException e) {
            log.warn("⚠️ Parcel cancellation failed: storeId={}, parcelId={}, error={}", 
                storeId, parcelId, e.getMessage());
            throw e;
        }
    }

    /**
     * POST /api/stores/{storeId}/dhl/warehouse/reset
     *
     * Setzt das virtuelle Lager eines Stores zurück (Teil B - Administration).
     *
     * Fachliche Bedeutung: ALLE aktuell STORED Pakete werden auf CANCELLED gesetzt
     * (Reason = WAREHOUSE_RESET). KEIN hartes DELETE - die Paket-Historie bleibt
     * vollständig erhalten. Die Lagerfächer selbst und deren Kapazität bleiben
     * unverändert bestehen; Occupancy zählt nur STORED Pakete und ist danach
     * automatisch 0.
     *
     * SECURITY:
     * - Erfordert Store-ADMIN-Rechte (StoreAccessChecker.isStoreAdmin), nicht nur
     *   normalen Store-Zugriff, da dies eine destruktiv wirkende Bulk-Aktion ist.
     * - Multi-Tenant: betrifft ausschließlich den angegebenen Store.
     * - Läuft in einer Transaktion (DhlParcelService.resetWarehouse).
     *
     * AUDIT: Für jedes betroffene Paket wird - wie beim einzelnen manuellen
     * Entfernen - ein STORAGE_CANCELLED Activity-Log-Eintrag erzeugt (Reason
     * WAREHOUSE_RESET), damit die Historie trotz Bulk-Aktion nachvollziehbar bleibt.
     *
     * Response:
     * {
     *   "cancelledCount": 63
     * }
     *
     * Errors:
     * - 401: Not authenticated
     * - 403: Kein Store-Admin
     */
    @PostMapping("/warehouse/reset")
    public ResponseEntity<?> resetWarehouse(
        @PathVariable Long storeId,
        @AuthenticationPrincipal User user
    ) {
        long startNanos = System.nanoTime();

        try {
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
            }

            if (!storeAccessChecker.isStoreAdmin(storeId)) {
                log.warn("⚠️ Warehouse reset denied: user={} is not admin of store={}",
                    user.getId(), storeId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Store admin access required");
            }

            Long userId = user.getId();
            String userEmail = user.getEmail() != null ? user.getEmail() : "unknown";

            List<DhlParcel> cancelledParcels = parcelService.resetWarehouse(storeId, userId, userEmail);

            long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);
            for (DhlParcel parcel : cancelledParcels) {
                activityLogService.logStorageCancelled(
                    storeId,
                    parcel.getId(),
                    parcel.getTrackingCode(),
                    parcel.getShelfLocation(),
                    userId,
                    userEmail,
                    storebackend.enums.CancellationReason.WAREHOUSE_RESET.name(),
                    "Warehouse reset",
                    durationMs
                );
            }

            log.info("✅ Warehouse reset by admin: user={}, store={}, cancelledCount={}",
                userEmail, storeId, cancelledParcels.size());

            return ResponseEntity.ok(Map.of("cancelledCount", cancelledParcels.size()));

        } catch (Exception e) {
            log.error("DHL warehouse reset error", e);
            return ResponseEntity.internalServerError().body("Internal server error");
        }
    }

    /**
     * POST /api/stores/{storeId}/dhl/tracking/validate
     * 
     * Validiert einen einzelnen Tracking-Code gegen DHL Tracking API
     * 
     * Request:
     * {
     *   "trackingCode": "00340434664988418341"
     * }
     * 
     * Response (VALID):
     * {
     *   "status": "VALID",
     *   "trackingCode": "00340434664988418341",
     *   "pieceCode": "00340434664988418341",
     *   "pieceIdentifier": "340434664988418341",
     *   "shipmentStatus": "Vsl. am nächsten Werktag in Filiale abholbereit",
     *   "standardEventCode": "ZF",
     *   "productName": "DHL PAKET, Filial-Routing, GoGreen Plus",
     *   "weightKg": 2.5,
     *   "dhlResponseCode": "0",
     *   "valid": true
     * }
     * 
     * Response (NOT_FOUND):
     * {
     *   "status": "NOT_FOUND",
     *   "trackingCode": "99999999999999999999",
     *   "dhlResponseCode": "100",
     *   "dhlErrorMessage": "Tracking code not found in DHL system",
     *   "valid": false
     * }
     * 
     * Errors:
     * - 401: Not authenticated
     * - 403: No access to store
     * - 400: Missing tracking code
     * - 500: DHL auth/technical/timeout errors
     * 
     * @since SCHRITT 2 - DHL Tracking Validation
     */
    @PostMapping("/tracking/validate")
    public ResponseEntity<?> validateTrackingCode(
        @PathVariable Long storeId,
        @RequestBody Map<String, String> request,
        @AuthenticationPrincipal User user
    ) {
        try {
            // 1. Authentication Check
            if (user == null) {
                log.warn("DHL tracking validation denied: User not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
            }

            // 2. Store Access Check (Multi-Tenant Security)
            if (!storeAccessChecker.hasStoreAccess(storeId)) {
                log.warn("DHL tracking validation denied: user={} has no access to store={}", 
                    user.getId(), storeId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied to store"));
            }

            // 3. Extract tracking code
            String trackingCode = request.get("trackingCode");
            if (trackingCode == null || trackingCode.isBlank()) {
                log.warn("DHL tracking validation: missing trackingCode, store={}, user={}", 
                    storeId, user.getId());
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Tracking code is required"));
            }

            log.info("🔍 DHL tracking validation requested: store={}, trackingCode={}, user={}", 
                storeId, trackingCode.trim(), user.getId());

            // 4. Call DHL Tracking Client
            storebackend.dto.dhl.DhlTrackingValidationResult result = 
                dhlTrackingClient.validateTrackingCode(storeId, trackingCode);

            log.info("✅ DHL tracking validation completed: store={}, trackingCode={}, status={}", 
                storeId, result.getTrackingCode(), result.getStatus());

            // 5. Return result (HTTP 200 for both VALID and NOT_FOUND)
            return ResponseEntity.ok(result);
            
        } catch (IllegalArgumentException e) {
            // Empty or invalid input
            log.warn("⚠️ DHL tracking validation: invalid input, store={}, error={}", 
                storeId, e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
            
        } catch (storebackend.exception.DhlTrackingException e) {
            // DHL technical/auth/connectivity errors
            log.error("❌ DHL tracking validation failed: store={}, errorCode={}, message={}", 
                storeId, e.getErrorCode(), e.getMessage());
            
            // Map error codes to HTTP status
            HttpStatus status;
            switch (e.getErrorCode()) {
                case AUTHENTICATION_ERROR:
                    status = HttpStatus.SERVICE_UNAVAILABLE;
                    break;
                case CONNECTIVITY_ERROR:
                    status = HttpStatus.GATEWAY_TIMEOUT;
                    break;
                case DHL_TECHNICAL_ERROR:
                case UNKNOWN_DHL_ERROR:
                case XML_PARSING_ERROR:
                case HTTP_ERROR:
                default:
                    status = HttpStatus.INTERNAL_SERVER_ERROR;
                    break;
            }
            
            return ResponseEntity.status(status)
                .body(Map.of(
                    "error", "DHL tracking validation failed",
                    "errorCode", e.getErrorCode().name(),
                    "messageKey", e.getMessageKey(),
                    "message", e.getMessage()
                ));
                
        } catch (storebackend.exception.DhlConfigurationException e) {
            // DHL not configured for this store
            log.error("❌ DHL tracking validation: DHL not configured, store={}, messageKey={}", 
                storeId, e.getMessageKey());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                    "error", "DHL integration not configured",
                    "messageKey", e.getMessageKey(),
                    "message", e.getMessage()
                ));
        }
    }
}


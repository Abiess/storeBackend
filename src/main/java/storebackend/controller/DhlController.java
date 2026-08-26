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
import storebackend.util.StoreAccessChecker;

import java.util.List;
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
    private final StoreAccessChecker storeAccessChecker;

    /**
     * POST /api/stores/{storeId}/dhl/parcels/store
     * 
     * Lagert Paket ein
     * 
     * Request:
     * {
     *   "trackingCode": "jvgl 0605 3797 0051 8040",
     *   "shelfLocation": "Regal B-12",
     *   "notes": "Optional"
     * }
     * 
     * Response:
     * {
     *   "id": 1,
     *   "storeId": 5,
     *   "trackingCode": "JVGL0605379700518040",
     *   "shelfLocation": "Regal B-12",
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
        @RequestBody DhlStoreParcelRequest request,
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

            // 3. Validation
            if (request.getTrackingCode() == null || request.getTrackingCode().isBlank()) {
                return ResponseEntity.badRequest().body("Tracking code is required");
            }
            if (request.getShelfLocation() == null || request.getShelfLocation().isBlank()) {
                return ResponseEntity.badRequest().body("Shelf location is required");
            }

            // 4. Store Parcel
            DhlParcel parcel = parcelService.storeParcel(
                storeId,
                request.getTrackingCode(),
                request.getShelfLocation(),
                request.getNotes()
            );

            DhlParcelResponse response = DhlParcelResponse.fromEntity(parcel);
            log.info("✅ DHL parcel stored: user={}, store={}, tracking={}", 
                user.getId(), storeId, response.getTrackingCode());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("DHL store parcel failed: {}", e.getMessage());
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
            return parcelService.findParcel(storeId, request.getTrackingCode())
                .map(parcel -> ResponseEntity.ok(DhlParcelResponse.fromEntity(parcel)))
                .orElse(ResponseEntity.notFound().build());

        } catch (IllegalArgumentException e) {
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

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.warn("DHL pickup parcel failed: {}", e.getMessage());
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
}


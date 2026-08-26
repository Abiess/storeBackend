package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.DhlSlotResponse;
import storebackend.entity.DhlParcel;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.User;
import storebackend.enums.DhlParcelStatus;
import storebackend.repository.DhlParcelRepository;
import storebackend.service.DhlShelfSlotService;
import storebackend.service.DhlShelfSlotService.SlotStats;
import storebackend.util.StoreAccessChecker;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * DHL Shelf Slot Controller (Phase 2)
 * 
 * REST API für Lagerplatz-Verwaltung
 */
@RestController
@RequestMapping("/api/stores/{storeId}/dhl/slots")
@RequiredArgsConstructor
@Slf4j
public class DhlSlotController {
    
    private final DhlShelfSlotService slotService;
    private final DhlParcelRepository parcelRepository;
    private final StoreAccessChecker storeAccessChecker;

    /**
     * GET /api/stores/{storeId}/dhl/slots
     * 
     * Listet alle Slots mit Belegungsstatus (für Grid-Visualisierung)
     * 
     * Response:
     * [
     *   { "id": 1, "code": "A1", "sortOrder": 1, "active": true, "occupied": false },
     *   { "id": 2, "code": "A2", "sortOrder": 2, "active": true, "occupied": true }
     * ]
     */
    @GetMapping
    public ResponseEntity<?> getSlots(
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

            // 1. Alle Slots laden
            List<DhlShelfSlot> slots = slotService.listAllSlots(storeId);
            
            // 2. Belegte Slot-IDs ermitteln (keine N+1 Query)
            List<Long> slotIds = slots.stream()
                .map(DhlShelfSlot::getId)
                .collect(Collectors.toList());
            
            Set<Long> occupiedSlotIds = parcelRepository.findAll().stream()
                .filter(p -> p.getShelfSlot() != null 
                    && p.getStatus() == DhlParcelStatus.STORED
                    && slotIds.contains(p.getShelfSlot().getId()))
                .map(p -> p.getShelfSlot().getId())
                .collect(Collectors.toSet());
            
            // 3. DTOs erstellen
            List<DhlSlotResponse> response = slots.stream()
                .map(slot -> DhlSlotResponse.fromEntity(
                    slot, 
                    occupiedSlotIds.contains(slot.getId())
                ))
                .collect(Collectors.toList());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Get slots error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * GET /api/stores/{storeId}/dhl/slots/stats
     * 
     * Statistiken für Dashboard
     * 
     * Response:
     * {
     *   "totalActive": 20,
     *   "freeSlots": 12,
     *   "occupiedSlots": 8,
     *   "occupancyPercent": 40.0
     * }
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getStats(
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

            SlotStats stats = slotService.getStats(storeId);
            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            log.error("Get stats error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * POST /api/stores/{storeId}/dhl/slots/allocate
     * 
     * Weist nächsten freien Slot zu (AUTO-Modus)
     * 
     * Response:
     * {
     *   "id": 3,
     *   "code": "A3",
     *   "sortOrder": 3,
     *   "active": true,
     *   "occupied": false
     * }
     * 
     * 400 wenn kein freier Slot verfügbar
     */
    @PostMapping("/allocate")
    public ResponseEntity<?> allocateSlot(
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

            DhlShelfSlot slot = slotService.allocateNextFreeSlot(storeId);
            DhlSlotResponse response = DhlSlotResponse.fromEntity(slot, false);
            
            log.info("✅ Slot allocated: user={}, store={}, slot={}", 
                user.getId(), storeId, slot.getCode());
            
            return ResponseEntity.ok(response);

        } catch (storebackend.exception.NoFreeSlotException e) {
            log.warn("No free slot: store={}", storeId);
            return ResponseEntity.badRequest()
                .body(Map.of("error", "NO_FREE_SLOT", "message", e.getMessage()));
        } catch (Exception e) {
            log.error("Allocate slot error", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * POST /api/stores/{storeId}/dhl/slots/initialize-default
     * 
     * Initialisiert Default-Slots (A1-C7)
     * Nur wenn noch keine Slots existieren
     * 
     * Response:
     * {
     *   "initialized": true,
     *   "count": 20
     * }
     */
    @PostMapping("/initialize-default")
    public ResponseEntity<?> initializeDefaultSlots(
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

            slotService.initializeDefaultSlots(storeId);
            
            long count = slotService.getStats(storeId).totalActive();
            
            log.info("✅ Slots initialized: user={}, store={}, count={}", 
                user.getId(), storeId, count);
            
            return ResponseEntity.ok(Map.of(
                "initialized", true,
                "count", count
            ));

        } catch (Exception e) {
            log.error("Initialize slots error", e);
            return ResponseEntity.internalServerError()
                .body(Map.of("error", "INITIALIZATION_FAILED", "message", e.getMessage()));
        }
    }
}

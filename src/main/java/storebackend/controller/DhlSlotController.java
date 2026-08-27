package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.*;
import storebackend.entity.DhlParcel;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.User;
import storebackend.enums.DhlParcelStatus;
import storebackend.repository.DhlParcelRepository;
import storebackend.service.DhlShelfSlotService;
import storebackend.service.DhlShelfSlotService.SlotStats;
import storebackend.service.DhlParcelService;
import storebackend.util.StoreAccessChecker;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * DHL Shelf Slot Controller
 * 
 * Phase 2: Basic Slot Operations (Grid, Stats, Allocate, Initialize)
 * Phase 3A.5: Slot Management (CRUD für Fachverwaltung)
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
    private final DhlParcelService parcelService;
    private final StoreAccessChecker storeAccessChecker;

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 3A.5 - SLOT MANAGEMENT (CRUD)
    // ════════════════════════════════════════════════════════════════════════

    /**
     * GET /api/stores/{storeId}/dhl/slots
     * 
     * Listet alle Fächer eines Stores mit occupiedCount
     * 
     * Phase 3A.5: Slot Management Frontend
     * 
     * Response: Array von DhlShelfSlotDto
     * [
     *   {
     *     "id": 123,
     *     "storeId": 121,
     *     "code": "A1",
     *     "capacity": 5,
     *     "sortOrder": 1,
     *     "active": true,
     *     "occupiedCount": 3
     *   }
     * ]
     */
    @GetMapping
    public ResponseEntity<List<DhlShelfSlotDto>> getSlots(
        @PathVariable Long storeId,
        @AuthenticationPrincipal User user
    ) {
        log.debug("GET /slots for store={}", storeId);
        
        // Multi-Tenant Security
        if (!storeAccessChecker.hasStoreAccess(storeId)) {
            log.warn("Access denied for user {} to store {}", user.getId(), storeId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        List<DhlShelfSlot> slots = slotService.listAllSlots(storeId);
        
        // Map to DTO with occupiedCount
        List<DhlShelfSlotDto> dtos = slots.stream()
            .map(slot -> {
                DhlShelfSlotDto dto = new DhlShelfSlotDto();
                dto.setId(slot.getId());
                dto.setStoreId(slot.getStore().getId());
                dto.setCode(slot.getCode());
                dto.setCapacity(slot.getCapacity());
                dto.setSortOrder(slot.getSortOrder());
                dto.setActive(slot.getActive());
                dto.setDescription(slot.getDescription());
                dto.setCreatedAt(slot.getCreatedAt());
                dto.setUpdatedAt(slot.getUpdatedAt());
                
                // Occupied Count
                long occupiedCount = parcelService.countStoredParcelsInSlot(storeId, slot.getId());
                dto.setOccupiedCount(occupiedCount);
                
                return dto;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(dtos);
    }
    
    /**
     * POST /api/stores/{storeId}/dhl/slots
     * 
     * Erstellt einzelnes Fach
     * 
     * Request:
     * {
     *   "code": "A7",
     *   "capacity": 5,
     *   "description": "Regal links oben"
     * }
     * 
     * Response: DhlShelfSlot
     */
    @PostMapping
    public ResponseEntity<DhlShelfSlot> createSlot(
        @PathVariable Long storeId,
        @RequestBody DhlCreateSlotRequest request,
        @AuthenticationPrincipal User user
    ) {
        log.info("POST /slots for store={}: code={}", storeId, request.getCode());
        
        // Multi-Tenant Security
        if (!storeAccessChecker.hasStoreAccess(storeId)) {
            log.warn("Access denied for user {} to store {}", user.getId(), storeId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        DhlShelfSlot slot = slotService.createSingleSlot(
            storeId,
            request.getCode(),
            request.getCapacity(),
            request.getDescription()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(slot);
    }
    
    /**
     * POST /api/stores/{storeId}/dhl/slots/batch
     * 
     * Erstellt mehrere Fächer atomar
     * 
     * Request:
     * {
     *   "prefix": "A",
     *   "startNumber": 1,
     *   "count": 10,
     *   "capacity": 5,
     *   "description": "Regal links"
     * }
     * 
     * Response: Array von DhlShelfSlot
     * 
     * ATOMICITY:
     * - ALLE Codes werden vor Insert validiert
     * - Bei einem Duplicate: KEINE Fächer werden erstellt
     */
    @PostMapping("/batch")
    public ResponseEntity<List<DhlShelfSlot>> createBulkSlots(
        @PathVariable Long storeId,
        @RequestBody DhlBulkCreateSlotsRequest request,
        @AuthenticationPrincipal User user
    ) {
        log.info("POST /slots/batch for store={}: prefix={}, start={}, count={}", 
            storeId, request.getPrefix(), request.getStartNumber(), request.getCount());
        
        // Multi-Tenant Security
        if (!storeAccessChecker.hasStoreAccess(storeId)) {
            log.warn("Access denied for user {} to store {}", user.getId(), storeId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        List<DhlShelfSlot> slots = slotService.createBulkSlots(
            storeId,
            request.getPrefix(),
            request.getStartNumber(),
            request.getCount(),
            request.getCapacity(),
            request.getDescription()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(slots);
    }
    
    /**
     * PUT /api/stores/{storeId}/dhl/slots/{slotId}
     * 
     * Aktualisiert Fach
     * 
     * Request:
     * {
     *   "capacity": 10,
     *   "active": false,
     *   "description": "Regal rechts oben"
     * }
     * 
     * VALIDIERUNGEN:
     * - Capacity darf nicht unter occupiedCount reduziert werden
     * - Belegtes Fach darf nicht deaktiviert werden
     */
    @PutMapping("/{slotId}")
    public ResponseEntity<DhlShelfSlot> updateSlot(
        @PathVariable Long storeId,
        @PathVariable Long slotId,
        @RequestBody DhlUpdateSlotRequest request,
        @AuthenticationPrincipal User user
    ) {
        log.info("PUT /slots/{} for store={}: capacity={}, active={}", 
            slotId, storeId, request.getCapacity(), request.getActive());
        
        // Multi-Tenant Security
        if (!storeAccessChecker.hasStoreAccess(storeId)) {
            log.warn("Access denied for user {} to store {}", user.getId(), storeId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        DhlShelfSlot slot = slotService.updateSlot(
            storeId,
            slotId,
            request.getCapacity(),
            request.getActive(),
            request.getDescription()
        );
        
        return ResponseEntity.ok(slot);
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE 2 - ORIGINAL SLOT OPERATIONS
    // ════════════════════════════════════════════════════════════════════════

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
            DhlSlotResponse response = DhlSlotResponse.fromEntity(slot, 0); // occupiedCount=0 (gerade allokiert)
            
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
            
            long count = slotService.getStats(storeId).totalSlots();
            
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

package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.*;
import storebackend.dto.DhlLayoutRequests.*;
import storebackend.entity.User;
import storebackend.service.DhlLayoutService;
import storebackend.util.StoreAccessChecker;

import java.util.List;

/**
 * DHL Layout Controller (Phase 3A)
 * 
 * REST API für visuellen Regalplan:
 * - Zonen verwalten
 * - Layout speichern/laden
 * - Batch-Updates für Drag&Drop
 * 
 * SECURITY:
 * - Multi-Tenant: storeId validation via StoreAccessChecker
 * - RBAC: Verwendet bestehende Store-Permissions
 */
@RestController
@RequestMapping("/api/stores/{storeId}/dhl")
@RequiredArgsConstructor
@Slf4j
public class DhlLayoutController {
    
    private final DhlLayoutService layoutService;
    private final StoreAccessChecker storeAccessChecker;

    // ========== ZONES ==========
    
    /**
     * GET /api/stores/{storeId}/dhl/zones
     * 
     * Listet alle Zonen eines Stores
     */
    @GetMapping("/zones")
    public ResponseEntity<List<DhlZoneDto>> getZones(
        @PathVariable Long storeId,
        @AuthenticationPrincipal User user
    ) {
        log.debug("GET /zones for store {}", storeId);
        storeAccessChecker.checkStoreAccess(user, storeId);
        
        List<DhlZoneDto> zones = layoutService.getZones(storeId);
        return ResponseEntity.ok(zones);
    }
    
    /**
     * POST /api/stores/{storeId}/dhl/zones
     * 
     * Erstellt neue Zone
     */
    @PostMapping("/zones")
    public ResponseEntity<DhlZoneDto> createZone(
        @PathVariable Long storeId,
        @RequestBody DhlZoneRequest request,
        @AuthenticationPrincipal User user
    ) {
        log.info("POST /zones for store {}: {}", storeId, request.getName());
        storeAccessChecker.checkStoreAccess(user, storeId);
        
        DhlZoneDto zone = layoutService.createZone(storeId, request);
        return ResponseEntity.ok(zone);
    }
    
    /**
     * PUT /api/stores/{storeId}/dhl/zones/{zoneId}
     * 
     * Aktualisiert Zone
     */
    @PutMapping("/zones/{zoneId}")
    public ResponseEntity<DhlZoneDto> updateZone(
        @PathVariable Long storeId,
        @PathVariable Long zoneId,
        @RequestBody DhlZoneRequest request,
        @AuthenticationPrincipal User user
    ) {
        log.info("PUT /zones/{} for store {}", zoneId, storeId);
        storeAccessChecker.checkStoreAccess(user, storeId);
        
        DhlZoneDto zone = layoutService.updateZone(storeId, zoneId, request);
        return ResponseEntity.ok(zone);
    }
    
    /**
     * DELETE /api/stores/{storeId}/dhl/zones/{zoneId}
     * 
     * Löscht Zone
     */
    @DeleteMapping("/zones/{zoneId}")
    public ResponseEntity<Void> deleteZone(
        @PathVariable Long storeId,
        @PathVariable Long zoneId,
        @AuthenticationPrincipal User user
    ) {
        log.info("DELETE /zones/{} for store {}", zoneId, storeId);
        storeAccessChecker.checkStoreAccess(user, storeId);
        
        layoutService.deleteZone(storeId, zoneId);
        return ResponseEntity.noContent().build();
    }

    // ========== LAYOUT ==========
    
    /**
     * GET /api/stores/{storeId}/dhl/layout
     * 
     * Lädt komplettes Layout für Store
     * 
     * Response: Array von Slots mit Position, Größe, Belegung, Zone
     */
    @GetMapping("/layout")
    public ResponseEntity<List<DhlShelfSlotLayoutDto>> getLayout(
        @PathVariable Long storeId,
        @AuthenticationPrincipal User user
    ) {
        log.debug("GET /layout for store {}", storeId);
        storeAccessChecker.checkStoreAccess(user, storeId);
        
        List<DhlShelfSlotLayoutDto> layout = layoutService.getLayout(storeId);
        return ResponseEntity.ok(layout);
    }
    
    /**
     * PUT /api/stores/{storeId}/dhl/layout
     * 
     * Batch-Update für Drag&Drop
     * 
     * Request: Array von Position-Updates
     * {
     *   "updates": [
     *     {"slotId": 123, "gridX": 0, "gridY": 0, "gridWidth": 1, "gridHeight": 1, "zoneId": 5},
     *     {"slotId": 124, "gridX": 1, "gridY": 0, "gridWidth": 2, "gridHeight": 1, "zoneId": null}
     *   ]
     * }
     */
    @PutMapping("/layout")
    public ResponseEntity<Void> updateLayout(
        @PathVariable Long storeId,
        @RequestBody DhlLayoutUpdateRequest request,
        @AuthenticationPrincipal User user
    ) {
        log.info("PUT /layout for store {} with {} updates", storeId, request.getUpdates().size());
        storeAccessChecker.checkStoreAccess(user, storeId);
        
        layoutService.updateLayoutBatch(storeId, request);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * POST /api/stores/{storeId}/dhl/layout/slots
     * 
     * Erstellt neuen Slot MIT Layout
     * 
     * Atomic: Slot + Layout in einer Transaktion
     */
    @PostMapping("/layout/slots")
    public ResponseEntity<DhlShelfSlotLayoutDto> createSlotWithLayout(
        @PathVariable Long storeId,
        @RequestBody DhlCreateSlotWithLayoutRequest request,
        @AuthenticationPrincipal User user
    ) {
        log.info("POST /layout/slots for store {}: code={}", storeId, request.getCode());
        storeAccessChecker.checkStoreAccess(user, storeId);
        
        DhlShelfSlotLayoutDto slot = layoutService.createSlotWithLayout(storeId, request);
        return ResponseEntity.ok(slot);
    }
}

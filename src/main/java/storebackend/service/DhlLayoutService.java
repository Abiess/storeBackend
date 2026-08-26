package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.DhlLayoutRequests.*;
import storebackend.dto.DhlShelfSlotLayoutDto;
import storebackend.dto.DhlZoneDto;
import storebackend.dto.DhlZoneRequest;
import storebackend.entity.*;
import storebackend.enums.DhlParcelStatus;
import storebackend.repository.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * DHL Layout Service (Phase 3A)
 * 
 * Business Logic für visuellen Regalplan:
 * - Zonen verwalten
 * - Layout speichern/laden
 * - Batch-Updates für Drag&Drop
 * - Validation
 * 
 * WICHTIG:
 * - DhlShelfSlot.id bleibt stabile Identität
 * - Layout-Änderungen verändern niemals Paketzuordnungen
 * - Multi-Tenant strikt validieren
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlLayoutService {
    
    private final DhlZoneRepository zoneRepository;
    private final DhlShelfSlotLayoutRepository layoutRepository;
    private final DhlShelfSlotRepository slotRepository;
    private final DhlParcelRepository parcelRepository;
    private final StoreRepository storeRepository;

    // ========== ZONES ==========
    
    /**
     * Listet alle Zonen eines Stores
     */
    @Transactional(readOnly = true)
    public List<DhlZoneDto> getZones(Long storeId) {
        log.debug("Loading zones for store {}", storeId);
        return zoneRepository.findByStoreIdOrderBySortOrder(storeId).stream()
            .map(DhlZoneDto::fromEntity)
            .collect(Collectors.toList());
    }
    
    /**
     * Erstellt neue Zone
     */
    @Transactional
    public DhlZoneDto createZone(Long storeId, DhlZoneRequest request) {
        log.info("Creating zone '{}' for store {}", request.getName(), storeId);
        
        // Validation
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Zone name is required");
        }
        
        // Check duplicate name
        if (zoneRepository.existsByStoreIdAndName(storeId, request.getName(), null)) {
            throw new IllegalArgumentException("Zone with name '" + request.getName() + "' already exists");
        }
        
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found"));
        
        DhlZone zone = new DhlZone();
        zone.setStore(store);
        zone.setName(request.getName());
        zone.setColor(request.getColor());
        zone.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);
        
        zone = zoneRepository.save(zone);
        return DhlZoneDto.fromEntity(zone);
    }
    
    /**
     * Aktualisiert Zone
     */
    @Transactional
    public DhlZoneDto updateZone(Long storeId, Long zoneId, DhlZoneRequest request) {
        log.info("Updating zone {} for store {}", zoneId, storeId);
        
        DhlZone zone = zoneRepository.findByStoreIdAndId(storeId, zoneId)
            .orElseThrow(() -> new IllegalArgumentException("Zone not found or access denied"));
        
        // Validation
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Zone name is required");
        }
        
        // Check duplicate name (exclude current zone)
        if (zoneRepository.existsByStoreIdAndName(storeId, request.getName(), zoneId)) {
            throw new IllegalArgumentException("Zone with name '" + request.getName() + "' already exists");
        }
        
        zone.setName(request.getName());
        zone.setColor(request.getColor());
        if (request.getSortOrder() != null) {
            zone.setSortOrder(request.getSortOrder());
        }
        
        zone = zoneRepository.save(zone);
        return DhlZoneDto.fromEntity(zone);
    }
    
    /**
     * Löscht Zone
     */
    @Transactional
    public void deleteZone(Long storeId, Long zoneId) {
        log.info("Deleting zone {} for store {}", zoneId, storeId);
        
        DhlZone zone = zoneRepository.findByStoreIdAndId(storeId, zoneId)
            .orElseThrow(() -> new IllegalArgumentException("Zone not found or access denied"));
        
        // Note: Layouts referencing this zone will have zone_id set to NULL (ON DELETE SET NULL)
        zoneRepository.delete(zone);
    }

    // ========== LAYOUT ==========
    
    /**
     * Lädt komplettes Layout für Store
     * 
     * Inkludiert:
     * - Slot-Daten (code, capacity, active)
     * - Position (x, y, width, height)
     * - Belegung (occupiedCount)
     * - Zone
     * 
     * N+1 vermieden durch Eager Loading + Batch-Query
     */
    @Transactional(readOnly = true)
    public List<DhlShelfSlotLayoutDto> getLayout(Long storeId) {
        log.debug("Loading layout for store {}", storeId);
        
        // 1. Layouts mit Slots + Zones laden (1 Query mit Joins)
        List<DhlShelfSlotLayout> layouts = layoutRepository.findByStoreIdWithSlotAndZone(storeId);
        
        if (layouts.isEmpty()) {
            return List.of();
        }
        
        // 2. OccupiedCounts für alle Slots in einem Batch-Query laden
        List<Long> slotIds = layouts.stream()
            .map(l -> l.getShelfSlot().getId())
            .collect(Collectors.toList());
        
        List<Object[]> occupiedCountsRaw = parcelRepository.countByStoreIdAndStatusGroupedBySlot(
            storeId, 
            DhlParcelStatus.STORED, 
            slotIds
        );
        
        Map<Long, Long> occupiedCounts = occupiedCountsRaw.stream()
            .collect(Collectors.toMap(
                row -> (Long) row[0],  // slotId
                row -> (Long) row[1]   // count
            ));
        
        // 3. DTOs bauen
        return layouts.stream()
            .map(layout -> {
                Long slotId = layout.getShelfSlot().getId();
                int occupied = occupiedCounts.getOrDefault(slotId, 0L).intValue();
                return DhlShelfSlotLayoutDto.fromEntity(layout, occupied);
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Batch-Update für Drag&Drop
     * 
     * WICHTIG:
     * - Nur Positionen/Größen werden geändert
     * - shelfSlot.id bleibt stabil
     * - Paketzuordnungen bleiben unverändert
     * - Capacity bleibt unverändert
     */
    @Transactional
    public void updateLayoutBatch(Long storeId, DhlLayoutUpdateRequest request) {
        log.info("Batch-updating {} layouts for store {}", request.getUpdates().size(), storeId);
        
        for (LayoutPositionUpdate update : request.getUpdates()) {
            // Find existing layout
            DhlShelfSlotLayout layout = layoutRepository.findByStoreIdAndSlotId(storeId, update.getSlotId())
                .orElseThrow(() -> new IllegalArgumentException(
                    "Layout for slot " + update.getSlotId() + " not found or access denied"
                ));
            
            // Update position/size
            layout.setGridX(update.getGridX());
            layout.setGridY(update.getGridY());
            layout.setGridWidth(update.getGridWidth());
            layout.setGridHeight(update.getGridHeight());
            
            // Update zone (optional)
            if (update.getZoneId() != null) {
                DhlZone zone = zoneRepository.findByStoreIdAndId(storeId, update.getZoneId())
                    .orElseThrow(() -> new IllegalArgumentException("Zone not found"));
                layout.setZone(zone);
            } else {
                layout.setZone(null);
            }
            
            layoutRepository.save(layout);
        }
        
        log.info("Batch-update completed for store {}", storeId);
    }
    
    /**
     * Erstellt neuen Slot MIT Layout
     * 
     * Atomic: Slot + Layout in einer Transaktion
     */
    @Transactional
    public DhlShelfSlotLayoutDto createSlotWithLayout(Long storeId, DhlCreateSlotWithLayoutRequest request) {
        log.info("Creating slot '{}' with layout for store {}", request.getCode(), storeId);
        
        // Validation
        if (request.getCode() == null || request.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("Slot code is required");
        }
        if (request.getCapacity() == null || request.getCapacity() < 1) {
            throw new IllegalArgumentException("Capacity must be >= 1");
        }
        
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found"));
        
        // Check duplicate code
        if (slotRepository.existsByStoreIdAndCode(storeId, request.getCode())) {
            throw new IllegalArgumentException("Slot with code '" + request.getCode() + "' already exists");
        }
        
        // 1. Create Slot
        DhlShelfSlot slot = new DhlShelfSlot();
        slot.setStore(store);
        slot.setCode(request.getCode());
        slot.setCapacity(request.getCapacity());
        slot.setDescription(request.getDescription());
        slot.setActive(true);
        
        // sortOrder = max + 1
        Integer maxSortOrder = slotRepository.findMaxSortOrderByStoreId(storeId);
        slot.setSortOrder(maxSortOrder != null ? maxSortOrder + 1 : 1);
        
        slot = slotRepository.save(slot);
        
        // 2. Create Layout
        DhlShelfSlotLayout layout = new DhlShelfSlotLayout();
        layout.setStore(store);
        layout.setShelfSlot(slot);
        layout.setGridX(request.getGridX() != null ? request.getGridX() : 0);
        layout.setGridY(request.getGridY() != null ? request.getGridY() : 0);
        layout.setGridWidth(request.getGridWidth() != null ? request.getGridWidth() : 1);
        layout.setGridHeight(request.getGridHeight() != null ? request.getGridHeight() : 1);
        
        if (request.getZoneId() != null) {
            DhlZone zone = zoneRepository.findByStoreIdAndId(storeId, request.getZoneId())
                .orElseThrow(() -> new IllegalArgumentException("Zone not found"));
            layout.setZone(zone);
        }
        
        layout = layoutRepository.save(layout);
        
        return DhlShelfSlotLayoutDto.fromEntity(layout, 0);
    }
}

package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.Store;
import storebackend.enums.DhlParcelStatus;
import storebackend.exception.DhlSlotException;
import storebackend.exception.NoFreeSlotException;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.repository.StoreRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * DHL Shelf Slot Service
 * 
 * RACE-CONDITION-SAFE:
 * - allocateNextFreeSlot() nutzt SERIALIZABLE Isolation
 * - PESSIMISTIC_WRITE Lock im Repository
 * - Garantiert: Parallel laufende Requests bekommen unterschiedliche Slots
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlShelfSlotService {
    
    private final DhlShelfSlotRepository slotRepository;
    private final StoreRepository storeRepository;
    private final DhlParcelRepository parcelRepository; // Phase 3A.5

    /**
     * Weist nächsten freien Slot zu (RACE-CONDITION-SAFE)
     * 
     * ISOLATION LEVEL SERIALIZABLE:
     * - Höchste Isolation
     * - Verhindert Phantom Reads
     * - Transaction 1 startet → sperrt Slot A3
     * - Transaction 2 startet → wartet
     * - Transaction 1 committed → A3 belegt
     * - Transaction 2 bekommt A4
     * 
     * @param storeId Store ID
     * @return DhlShelfSlot (gesperrt während Transaction)
     * @throws NoFreeSlotException wenn alle Slots belegt
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public DhlShelfSlot allocateNextFreeSlot(Long storeId) {
        log.debug("🔒 Allocating next free slot for store={}", storeId);
        
        // PESSIMISTIC_WRITE Lock - wartet wenn Slot von anderer Transaction gesperrt
        DhlShelfSlot freeSlot = slotRepository.findNextFreeSlotForUpdate(storeId)
            .orElseThrow(() -> {
                log.warn("❌ No free slot available for store={}", storeId);
                return new NoFreeSlotException(storeId);
            });
        
        log.info("✅ Allocated slot: store={}, slot={}, sortOrder={}", 
            storeId, freeSlot.getCode(), freeSlot.getSortOrder());
        
        return freeSlot;
        // WICHTIG: Slot bleibt gesperrt bis Transaction committed
        // Parallel laufende allocateNextFreeSlot() wartet hier
    }

    /**
     * Listet alle Slots mit Status (frei/belegt)
     * 
     * @param storeId Store ID
     * @return List<DhlShelfSlot>
     */
    @Transactional(readOnly = true)
    public List<DhlShelfSlot> listAllSlots(Long storeId) {
        return slotRepository.findByStoreIdOrderBySortOrder(storeId);
    }

    /**
     * Findet Slot anhand Code
     * 
     * @param storeId Store ID
     * @param code Slot-Code (z.B. "A1")
     * @return DhlShelfSlot
     * @throws IllegalArgumentException wenn nicht gefunden
     */
    @Transactional(readOnly = true)
    public DhlShelfSlot findSlotByCode(Long storeId, String code) {
        return slotRepository.findByStoreIdAndCode(storeId, code)
            .orElseThrow(() -> new IllegalArgumentException(
                "Slot not found: store=" + storeId + ", code=" + code
            ));
    }

    /**
     * Statistiken für Dashboard (Phase 2.1: Capacity-based)
     * 
     * @param storeId Store ID
     * @return SlotStats mit Gesamtkapazität und belegten Paketplätzen
     */
    @Transactional(readOnly = true)
    public SlotStats getStats(Long storeId) {
        long totalCapacity = slotRepository.sumTotalCapacity(storeId);
        long occupiedParcels = slotRepository.countOccupiedParcels(storeId);
        long totalSlots = slotRepository.countActiveSlots(storeId);
        long slotsWithCapacity = slotRepository.countSlotsWithCapacity(storeId);
        
        long freeCapacity = totalCapacity - occupiedParcels;
        
        double occupancy = totalCapacity > 0 
            ? (double) occupiedParcels / totalCapacity * 100 
            : 0.0;
        
        return new SlotStats(
            totalSlots,          // Anzahl Slots
            totalCapacity,       // Gesamtkapazität (Paketplätze)
            slotsWithCapacity,   // Slots mit Platz
            freeCapacity,        // Freie Paketplätze
            occupiedParcels,     // Belegte Paketplätze
            occupancy            // Auslastung %
        );
    }

    /**
     * Initialisiert Default-Slots für Store (A1-C7)
     * 
     * Wird NICHT automatisch aufgerufen.
     * Nur wenn explizit gewünscht (z.B. bei Store-Erstellung).
     * 
     * @param storeId Store ID
     */
    @Transactional
    public void initializeDefaultSlots(Long storeId) {
        // Prüfen ob bereits Slots existieren
        if (slotRepository.existsByStoreId(storeId)) {
            log.warn("Store already has slots, skipping initialization: storeId={}", storeId);
            return;
        }
        
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));
        
        List<DhlShelfSlot> slots = new ArrayList<>();
        int sortOrder = 1;
        
        // A1-A6
        for (int i = 1; i <= 6; i++) {
            slots.add(createSlot(store, "A" + i, sortOrder++));
        }
        
        // B1-B7
        for (int i = 1; i <= 7; i++) {
            slots.add(createSlot(store, "B" + i, sortOrder++));
        }
        
        // C1-C7
        for (int i = 1; i <= 7; i++) {
            slots.add(createSlot(store, "C" + i, sortOrder++));
        }
        
        slotRepository.saveAll(slots);
        log.info("✅ Initialized {} default slots for store={}", slots.size(), storeId);
    }
    
    private DhlShelfSlot createSlot(Store store, String code, int sortOrder) {
        DhlShelfSlot slot = new DhlShelfSlot();
        slot.setStore(store);
        slot.setCode(code);
        slot.setSortOrder(sortOrder);
        slot.setActive(true);
        slot.setCapacity(1); // Phase 2.1: Default capacity
        return slot;
    }

    /**
     * Stats DTO
     */
    /**
     * Phase 2.1: Stats mit Gesamtkapazität
     */
    public record SlotStats(
        long totalSlots,       // Anzahl Slots
        long totalCapacity,    // Gesamtkapazität (Paketplätze)
        long slotsWithCapacity,// Slots mit freier Kapazität
        long freeCapacity,     // Freie Paketplätze
        long occupiedSlots,    // Belegte Paketplätze (=Parcels)
        double occupancyPercentage // Auslastung %
    ) {}
    
    // ════════════════════════════════════════════════════════════════════════
    // PHASE 3A.5 - FACHVERWALTUNG
    // ════════════════════════════════════════════════════════════════════════
    
    /**
     * Erstellt einzelnes Fach (Phase 3A.5)
     * 
     * CODE-NORMALISIERUNG:
     * - trim()
     * - toUpperCase()
     * 
     * VALIDIERUNG:
     * - Code unique pro Store
     * - Capacity >= 1
     * 
     * @param storeId Store ID
     * @param code Fach-Code (z.B. "A7", wird normalisiert zu "A7")
     * @param capacity Kapazität (min 1)
     * @param description Optionale Beschreibung
     * @return DhlShelfSlot
     * @throws DhlSlotException bei Validation-Fehler
     */
    @Transactional
    public DhlShelfSlot createSingleSlot(Long storeId, String code, Integer capacity, String description) {
        log.info("Creating single slot: store={}, code={}, capacity={}", storeId, code, capacity);
        
        // Code normalisieren
        String normalizedCode = normalizeSlotCode(code);
        
        // Validation
        if (capacity < 1) {
            throw new DhlSlotException("INVALID_SLOT_CAPACITY", 
                "Capacity must be at least 1",
                Map.of("capacity", capacity));
        }
        
        // Duplicate Check
        if (slotRepository.existsByStoreIdAndCode(storeId, normalizedCode)) {
            throw new DhlSlotException("SLOT_CODE_ALREADY_EXISTS",
                "Slot code already exists: " + normalizedCode,
                Map.of("code", normalizedCode));
        }
        
        // Store laden
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));
        
        // sortOrder berechnen
        Integer maxSort = slotRepository.findMaxSortOrderByStoreId(storeId);
        int newSortOrder = (maxSort == null) ? 1 : maxSort + 1;
        
        // Slot erstellen
        DhlShelfSlot slot = new DhlShelfSlot();
        slot.setStore(store);
        slot.setCode(normalizedCode);
        slot.setCapacity(capacity);
        slot.setSortOrder(newSortOrder);
        slot.setActive(true);
        slot.setDescription(description);
        
        slot = slotRepository.save(slot);
        log.info("✅ Created slot: id={}, code={}, sortOrder={}", 
            slot.getId(), slot.getCode(), slot.getSortOrder());
        
        return slot;
    }
    
    /**
     * Erstellt mehrere Fächer atomar (Phase 3A.5)
     * 
     * ATOMICITY:
     * - ALLE Codes werden VOR dem ersten INSERT validiert
     * - Bei einem Konflikt: KEINE Fächer werden erstellt
     * 
     * BEISPIEL:
     * prefix="A", start=1, count=10
     * → A1, A2, A3, ..., A10
     * 
     * @param storeId Store ID
     * @param prefix Präfix (z.B. "A", wird normalisiert)
     * @param startNumber Startnummer (z.B. 1)
     * @param count Anzahl (1-100)
     * @param capacity Kapazität pro Fach
     * @param description Beschreibung (für alle Fächer)
     * @return List<DhlShelfSlot>
     * @throws DhlSlotException bei Validation-Fehler oder Duplicate
     */
    @Transactional
    public List<DhlShelfSlot> createBulkSlots(
        Long storeId, 
        String prefix, 
        Integer startNumber, 
        Integer count, 
        Integer capacity,
        String description
    ) {
        log.info("Creating bulk slots: store={}, prefix={}, start={}, count={}, capacity={}", 
            storeId, prefix, startNumber, count, capacity);
        
        // Validation
        if (count < 1 || count > 100) {
            throw new DhlSlotException("INVALID_BATCH_COUNT",
                "Count must be between 1 and 100",
                Map.of("count", count));
        }
        
        if (capacity < 1) {
            throw new DhlSlotException("INVALID_SLOT_CAPACITY",
                "Capacity must be at least 1",
                Map.of("capacity", capacity));
        }
        
        // Prefix normalisieren
        String normalizedPrefix = normalizeSlotCode(prefix);
        
        // Codes generieren
        List<String> codes = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            codes.add(normalizedPrefix + (startNumber + i));
        }
        
        // ATOMIC VALIDATION: ALLE Codes prüfen BEVOR Insert
        for (String code : codes) {
            if (slotRepository.existsByStoreIdAndCode(storeId, code)) {
                throw new DhlSlotException("SLOT_CODE_ALREADY_EXISTS",
                    "Slot code already exists: " + code,
                    Map.of("code", code, "attemptedCodes", codes));
            }
        }
        
        // Store laden
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));
        
        // sortOrder berechnen
        Integer maxSort = slotRepository.findMaxSortOrderByStoreId(storeId);
        int sortOrder = (maxSort == null) ? 1 : maxSort + 1;
        
        // Slots erstellen
        List<DhlShelfSlot> slots = new ArrayList<>();
        for (String code : codes) {
            DhlShelfSlot slot = new DhlShelfSlot();
            slot.setStore(store);
            slot.setCode(code);
            slot.setCapacity(capacity);
            slot.setSortOrder(sortOrder++);
            slot.setActive(true);
            slot.setDescription(description);
            slots.add(slot);
        }
        
        slots = slotRepository.saveAll(slots);
        log.info("✅ Created {} slots: {}", slots.size(), codes);
        
        return slots;
    }
    
    /**
     * Aktualisiert Fach (Phase 3A.5)
     * 
     * VALIDIERUNG:
     * - Capacity >= 1
     * - Capacity >= occupiedCount
     * - Belegtes Fach darf nicht deaktiviert werden
     * 
     * @param storeId Store ID (Multi-Tenant Security)
     * @param slotId Slot ID
     * @param newCapacity Neue Kapazität (optional)
     * @param newActive Neuer Aktiv-Status (optional)
     * @param newDescription Neue Beschreibung (optional)
     * @return DhlShelfSlot
     * @throws DhlSlotException bei Validation-Fehler
     */
    @Transactional
    public DhlShelfSlot updateSlot(
        Long storeId, 
        Long slotId, 
        Integer newCapacity, 
        Boolean newActive,
        String newDescription
    ) {
        log.info("Updating slot: store={}, slotId={}, capacity={}, active={}", 
            storeId, slotId, newCapacity, newActive);
        
        // Slot laden
        DhlShelfSlot slot = slotRepository.findById(slotId)
            .orElseThrow(() -> new DhlSlotException("SLOT_NOT_FOUND",
                "Slot not found: " + slotId,
                Map.of("slotId", slotId)));
        
        // Multi-Tenant Security: Store muss stimmen
        if (!slot.getStore().getId().equals(storeId)) {
            log.warn("⚠️ Security: User tried to update slot from different store: slotId={}, actualStore={}, requestedStore={}", 
                slotId, slot.getStore().getId(), storeId);
            throw new DhlSlotException("SLOT_NOT_FOUND", // nicht "ACCESS_DENIED" → 404 statt 403
                "Slot not found",
                Map.of("slotId", slotId));
        }
        
        // Occupied Count berechnen
        long occupiedCount = parcelRepository.countByStoreIdAndShelfSlotIdAndStatus(
            storeId, slotId, DhlParcelStatus.STORED);
        
        // Capacity-Validation
        if (newCapacity != null) {
            if (newCapacity < 1) {
                throw new DhlSlotException("INVALID_SLOT_CAPACITY",
                    "Capacity must be at least 1",
                    Map.of("capacity", newCapacity));
            }
            
            if (newCapacity < occupiedCount) {
                throw new DhlSlotException("CAPACITY_BELOW_OCCUPIED",
                    String.format("Cannot reduce capacity below occupied count: capacity=%d, occupied=%d", 
                        newCapacity, occupiedCount),
                    Map.of("requestedCapacity", newCapacity, "occupiedCount", occupiedCount));
            }
            
            slot.setCapacity(newCapacity);
        }
        
        // Active-Validation
        if (newActive != null) {
            if (!newActive && occupiedCount > 0) {
                throw new DhlSlotException("CANNOT_DEACTIVATE_OCCUPIED_SLOT",
                    String.format("Cannot deactivate slot with %d stored parcels", occupiedCount),
                    Map.of("occupiedCount", occupiedCount));
            }
            
            slot.setActive(newActive);
        }
        
        // Description
        if (newDescription != null) {
            slot.setDescription(newDescription);
        }
        
        slot = slotRepository.save(slot);
        log.info("✅ Updated slot: id={}, code={}", slot.getId(), slot.getCode());
        
        return slot;
    }
    
    /**
     * Normalisiert Slot-Code
     * 
     * Beispiele:
     * - " a1 " → "A1"
     * - "r15" → "R15"
     * - " SHELF-01 " → "SHELF-01"
     * 
     * @param code Raw code
     * @return Normalized code
     */
    private String normalizeSlotCode(String code) {
        if (code == null || code.isBlank()) {
            throw new DhlSlotException("INVALID_SLOT_CODE", "Slot code cannot be empty");
        }
        return code.trim().toUpperCase();
    }
}


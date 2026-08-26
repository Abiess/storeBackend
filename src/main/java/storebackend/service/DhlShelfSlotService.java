package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.Store;
import storebackend.exception.NoFreeSlotException;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.repository.StoreRepository;

import java.util.ArrayList;
import java.util.List;

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
     * Statistiken für Dashboard
     * 
     * @param storeId Store ID
     * @return SlotStats
     */
    @Transactional(readOnly = true)
    public SlotStats getStats(Long storeId) {
        long totalActive = slotRepository.countActiveSlots(storeId);
        long freeSlots = slotRepository.countFreeSlots(storeId);
        long occupiedSlots = totalActive - freeSlots;
        
        double occupancy = totalActive > 0 
            ? (double) occupiedSlots / totalActive * 100 
            : 0.0;
        
        return new SlotStats(totalActive, freeSlots, occupiedSlots, occupancy);
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
        return slot;
    }

    /**
     * Stats DTO
     */
    public record SlotStats(
        long totalActive,
        long freeSlots,
        long occupiedSlots,
        double occupancyPercent
    ) {}
}

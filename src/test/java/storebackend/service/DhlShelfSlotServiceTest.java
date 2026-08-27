package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.Store;
import storebackend.enums.DhlParcelStatus;
import storebackend.exception.DhlSlotException;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.repository.StoreRepository;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

/**
 * DHL Shelf Slot Service Tests
 * 
 * Phase 3A.5 - Fachverwaltung Backend Tests
 * 
 * Tests:
 * - Single slot creation
 * - Bulk slot creation (atomic)
 * - Duplicate code handling (exact + normalized)
 * - Capacity validation
 * - Occupied slot restrictions
 * - Multi-tenant isolation
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DHL Shelf Slot Service Tests (Phase 3A.5)")
public class DhlShelfSlotServiceTest {
    
    @Mock
    private DhlShelfSlotRepository slotRepository;
    
    @Mock
    private StoreRepository storeRepository;
    
    @Mock
    private DhlParcelRepository parcelRepository;
    
    @InjectMocks
    private DhlShelfSlotService service;
    
    private Store mockStore;
    private DhlShelfSlot mockSlot;
    
    @BeforeEach
    void setUp() {
        mockStore = new Store();
        mockStore.setId(121L);
        mockStore.setName("Test Store");
        
        mockSlot = new DhlShelfSlot();
        mockSlot.setId(1L);
        mockSlot.setStore(mockStore);
        mockSlot.setCode("A1");
        mockSlot.setCapacity(5);
        mockSlot.setSortOrder(1);
        mockSlot.setActive(true);
    }
    
    // ════════════════════════════════════════════════════════════════════════
    // SINGLE SLOT CREATION
    // ════════════════════════════════════════════════════════════════════════
    
    @Test
    @DisplayName("createSingleSlot: Erfolgreich")
    void createSingleSlot_Success() {
        // Given
        Long storeId = 121L;
        String code = "A7";
        Integer capacity = 5;
        
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        when(slotRepository.existsByStoreIdAndCode(storeId, "A7")).thenReturn(false);
        when(slotRepository.findMaxSortOrderByStoreId(storeId)).thenReturn(20); // Integer, not Optional
        when(slotRepository.save(any(DhlShelfSlot.class))).thenAnswer(inv -> inv.getArgument(0));
        
        // When
        DhlShelfSlot result = service.createSingleSlot(storeId, code, capacity, null);
        
        // Then
        assertNotNull(result);
        assertEquals("A7", result.getCode());
        assertEquals(5, result.getCapacity());
        assertEquals(21, result.getSortOrder()); // maxSortOrder + 1
        assertTrue(result.getActive());
        
        verify(slotRepository).save(any(DhlShelfSlot.class));
    }
    
    @Test
    @DisplayName("createSingleSlot: Duplicate Code → SLOT_CODE_ALREADY_EXISTS")
    void createSingleSlot_DuplicateCode() {
        // Given
        Long storeId = 121L;
        lenient().when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        when(slotRepository.existsByStoreIdAndCode(storeId, "A1")).thenReturn(true);
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.createSingleSlot(storeId, "A1", 5, null);
        });
        
        assertEquals("SLOT_CODE_ALREADY_EXISTS", ex.getCode());
        verify(slotRepository, never()).save(any());
    }
    
    @Test
    @DisplayName("createSingleSlot: Normalized Duplicate (a1 vs A1) → Fehler")
    void createSingleSlot_NormalizedDuplicate() {
        // Given
        Long storeId = 121L;
        lenient().when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        // Normalisiert zu "A1"
        when(slotRepository.existsByStoreIdAndCode(storeId, "A1")).thenReturn(true);
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.createSingleSlot(storeId, " a1 ", 5, null); // mit Spaces und lowercase
        });
        
        assertEquals("SLOT_CODE_ALREADY_EXISTS", ex.getCode());
    }
    
    @Test
    @DisplayName("createSingleSlot: Capacity < 1 → INVALID_SLOT_CAPACITY")
    void createSingleSlot_InvalidCapacity() {
        // Given
        Long storeId = 121L;
        lenient().when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.createSingleSlot(storeId, "B1", 0, null);
        });
        
        assertEquals("INVALID_SLOT_CAPACITY", ex.getCode());
    }
    
    // ════════════════════════════════════════════════════════════════════════
    // BULK SLOT CREATION
    // ════════════════════════════════════════════════════════════════════════
    
    @Test
    @DisplayName("createBulkSlots: 10 Fächer erfolgreich")
    void createBulkSlots_Success() {
        // Given
        Long storeId = 121L;
        String prefix = "B";
        int startNumber = 1;
        int count = 10;
        int capacity = 5;
        
        when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        when(slotRepository.findMaxSortOrderByStoreId(storeId)).thenReturn(20); // Integer, not Optional
        
        // Keine Codes existieren
        when(slotRepository.existsByStoreIdAndCode(eq(storeId), anyString())).thenReturn(false);
        
        when(slotRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        
        // When
        List<DhlShelfSlot> result = service.createBulkSlots(storeId, prefix, startNumber, count, capacity, null);
        
        // Then
        assertNotNull(result);
        assertEquals(10, result.size());
        assertEquals("B1", result.get(0).getCode());
        assertEquals("B10", result.get(9).getCode());
        assertEquals(21, result.get(0).getSortOrder());
        assertEquals(30, result.get(9).getSortOrder());
        
        verify(slotRepository).saveAll(argThat((List<DhlShelfSlot> list) -> list.size() == 10));
    }
    
    @Test
    @DisplayName("createBulkSlots: Collision bei B5 → KEINE Fächer erstellt (atomic)")
    void createBulkSlots_PartialCollision_NoSlotsCreated() {
        // Given
        Long storeId = 121L;
        lenient().when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        
        // B5 existiert bereits
        when(slotRepository.existsByStoreIdAndCode(storeId, "B1")).thenReturn(false);
        when(slotRepository.existsByStoreIdAndCode(storeId, "B2")).thenReturn(false);
        when(slotRepository.existsByStoreIdAndCode(storeId, "B3")).thenReturn(false);
        when(slotRepository.existsByStoreIdAndCode(storeId, "B4")).thenReturn(false);
        when(slotRepository.existsByStoreIdAndCode(storeId, "B5")).thenReturn(true); // ← Conflict
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.createBulkSlots(storeId, "B", 1, 10, 5, null);
        });
        
        assertEquals("SLOT_CODE_ALREADY_EXISTS", ex.getCode());
        assertTrue(ex.getDetails().containsKey("code"));
        assertEquals("B5", ex.getDetails().get("code")); // "code", not "conflictingCode"
        
        // ATOMIC: KEINE Fächer wurden erstellt
        verify(slotRepository, never()).save(any());
        verify(slotRepository, never()).saveAll(anyList());
    }
    
    @Test
    @DisplayName("createBulkSlots: Count > 100 → INVALID_BATCH_COUNT")
    void createBulkSlots_TooMany() {
        // Given
        Long storeId = 121L;
        lenient().when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.createBulkSlots(storeId, "X", 1, 150, 5, null);
        });
        
        assertEquals("INVALID_BATCH_COUNT", ex.getCode());
    }
    
    @Test
    @DisplayName("createBulkSlots: Capacity < 1 → INVALID_SLOT_CAPACITY")
    void createBulkSlots_InvalidCapacity() {
        // Given
        Long storeId = 121L;
        lenient().when(storeRepository.findById(storeId)).thenReturn(Optional.of(mockStore));
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.createBulkSlots(storeId, "X", 1, 10, 0, null);
        });
        
        assertEquals("INVALID_SLOT_CAPACITY", ex.getCode());
    }
    
    // ════════════════════════════════════════════════════════════════════════
    // UPDATE SLOT
    // ════════════════════════════════════════════════════════════════════════
    
    @Test
    @DisplayName("updateSlot: Kapazität erhöhen → Erfolgreich")
    void updateSlot_IncreaseCapacity() {
        // Given
        Long storeId = 121L;
        Long slotId = 1L;
        
        mockSlot.setCapacity(5);
        when(slotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(parcelRepository.countByStoreIdAndShelfSlotIdAndStatus(storeId, slotId, DhlParcelStatus.STORED))
            .thenReturn(2L);
        when(slotRepository.save(any(DhlShelfSlot.class))).thenAnswer(inv -> inv.getArgument(0));
        
        // When
        DhlShelfSlot result = service.updateSlot(storeId, slotId, 10, null, null);
        
        // Then
        assertEquals(10, result.getCapacity());
        verify(slotRepository).save(mockSlot);
    }
    
    @Test
    @DisplayName("updateSlot: Kapazität unter occupied → CAPACITY_BELOW_OCCUPIED")
    void updateSlot_CapacityBelowOccupied() {
        // Given
        Long storeId = 121L;
        Long slotId = 1L;
        
        mockSlot.setCapacity(5);
        when(slotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(parcelRepository.countByStoreIdAndShelfSlotIdAndStatus(storeId, slotId, DhlParcelStatus.STORED))
            .thenReturn(3L); // 3 Pakete belegt
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.updateSlot(storeId, slotId, 2, null, null); // Kapazität auf 2 reduzieren
        });
        
        assertEquals("CAPACITY_BELOW_OCCUPIED", ex.getCode());
        assertTrue(ex.getDetails().containsKey("occupiedCount"));
        assertEquals(3L, ex.getDetails().get("occupiedCount")); // Long, not String
        
        verify(slotRepository, never()).save(any());
    }
    
    @Test
    @DisplayName("updateSlot: Belegtes Fach deaktivieren → CANNOT_DEACTIVATE_OCCUPIED_SLOT")
    void updateSlot_DeactivateOccupied() {
        // Given
        Long storeId = 121L;
        Long slotId = 1L;
        
        when(slotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(parcelRepository.countByStoreIdAndShelfSlotIdAndStatus(storeId, slotId, DhlParcelStatus.STORED))
            .thenReturn(1L); // 1 Paket belegt
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.updateSlot(storeId, slotId, null, false, null); // active = false
        });
        
        assertEquals("CANNOT_DEACTIVATE_OCCUPIED_SLOT", ex.getCode());
        verify(slotRepository, never()).save(any());
    }
    
    @Test
    @DisplayName("updateSlot: Leeres Fach deaktivieren → Erfolgreich")
    void updateSlot_DeactivateEmpty() {
        // Given
        Long storeId = 121L;
        Long slotId = 1L;
        
        when(slotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        when(parcelRepository.countByStoreIdAndShelfSlotIdAndStatus(storeId, slotId, DhlParcelStatus.STORED))
            .thenReturn(0L); // Leer
        when(slotRepository.save(any(DhlShelfSlot.class))).thenAnswer(inv -> inv.getArgument(0));
        
        // When
        DhlShelfSlot result = service.updateSlot(storeId, slotId, null, false, null);
        
        // Then
        assertFalse(result.getActive());
        verify(slotRepository).save(mockSlot);
    }
    
    // ════════════════════════════════════════════════════════════════════════
    // MULTI-TENANT SECURITY
    // ════════════════════════════════════════════════════════════════════════
    
    @Test
    @DisplayName("updateSlot: Store 121 kann Slot von Store 122 NICHT verändern")
    void updateSlot_MultiTenantIsolation() {
        // Given
        Long requestStoreId = 121L;
        Long slotId = 1L;
        
        Store otherStore = new Store();
        otherStore.setId(122L);
        
        mockSlot.setStore(otherStore); // Slot gehört zu Store 122
        when(slotRepository.findById(slotId)).thenReturn(Optional.of(mockSlot));
        
        // When + Then
        DhlSlotException ex = assertThrows(DhlSlotException.class, () -> {
            service.updateSlot(requestStoreId, slotId, 10, null, null);
        });
        
        assertEquals("SLOT_NOT_FOUND", ex.getCode());
        verify(slotRepository, never()).save(any());
    }
}

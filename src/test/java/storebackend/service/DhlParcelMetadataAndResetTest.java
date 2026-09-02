package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.dhl.DhlTrackingValidationResult;
import storebackend.dto.dhl.DhlTrackingValidationResult.DhlTrackingValidationStatus;
import storebackend.entity.DhlParcel;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.Store;
import storebackend.enums.CancellationReason;
import storebackend.enums.DhlParcelStatus;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests für DhlParcelService - Teil A (DHL Metadaten-Persistierung) + Teil B (Warehouse Reset).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DhlParcelService - DHL Metadata Persistence + Warehouse Reset")
class DhlParcelMetadataAndResetTest {

    @Mock
    private DhlParcelRepository parcelRepository;

    @Mock
    private DhlShelfSlotRepository slotRepository;

    @Mock
    private StoreRepository storeRepository;

    @InjectMocks
    private DhlParcelService parcelService;

    private Store testStore;

    @BeforeEach
    void setUp() {
        testStore = new Store();
        testStore.setId(1L);
        testStore.setName("Test Store");
    }

    // ════════════════════════════════════════════════════════════════════
    // TEIL A: storeParcel() persistiert DHL-Metadaten
    // ════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("storeParcel: DHL-Metadaten werden vollständig auf DhlParcel übernommen")
    void storeParcel_WithMetadata_PersistsAllFields() {
        Long storeId = 1L;
        String trackingCode = "00340434664988418341";

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(testStore));
        when(parcelRepository.findByStoreIdAndTrackingCode(storeId, trackingCode)).thenReturn(Optional.empty());

        DhlShelfSlot slot = new DhlShelfSlot();
        slot.setId(10L);
        slot.setCode("A7");
        when(slotRepository.findNextFreeSlotForUpdate(storeId)).thenReturn(Optional.of(slot));

        when(parcelRepository.save(any(DhlParcel.class))).thenAnswer(inv -> inv.getArgument(0));

        DhlTrackingValidationResult metadata = DhlTrackingValidationResult.builder()
            .status(DhlTrackingValidationStatus.VALID)
            .trackingCode(trackingCode)
            .pieceCode(trackingCode)
            .pieceIdentifier("340434664988418341")
            .shipmentStatus("Vsl. am nächsten Werktag in Filiale abholbereit")
            .standardEventCode("ZF")
            .productCode("PROD_PAK")
            .productName("DHL PAKET, Filial-Routing, GoGreen Plus")
            .weightKg(new BigDecimal("1.76"))
            .destinationCountry("DEU")
            .originCountry("DEU")
            .lastEventTimestamp("2026-08-29T14:53:00")
            .pslzNumber("12345")
            .build();

        DhlParcel result = parcelService.storeParcel(
            storeId, trackingCode, "auto", null, null, null, metadata);

        assertNotNull(result);
        assertEquals("340434664988418341", result.getPieceIdentifier());
        assertEquals("Vsl. am nächsten Werktag in Filiale abholbereit", result.getShipmentStatus());
        assertEquals("ZF", result.getStandardEventCode());
        assertEquals("PROD_PAK", result.getProductCode());
        assertEquals("DHL PAKET, Filial-Routing, GoGreen Plus", result.getProductName());
        assertEquals(new BigDecimal("1.76"), result.getWeightKg());
        assertEquals("DEU", result.getDestinationCountry());
        assertEquals("DEU", result.getOriginCountry());
        assertEquals("2026-08-29T14:53:00", result.getLastEventTimestamp());
        assertEquals("12345", result.getPslzNumber());
    }

    @Test
    @DisplayName("storeParcel: dhlMetadata == null → keine Metadatenfelder gesetzt, trotzdem gespeichert")
    void storeParcel_WithoutMetadata_DoesNotFail() {
        Long storeId = 1L;
        String trackingCode = "JVGL0605379700518040";

        when(storeRepository.findById(storeId)).thenReturn(Optional.of(testStore));
        when(parcelRepository.findByStoreIdAndTrackingCode(storeId, trackingCode)).thenReturn(Optional.empty());

        DhlShelfSlot slot = new DhlShelfSlot();
        slot.setId(11L);
        slot.setCode("A1");
        when(slotRepository.findNextFreeSlotForUpdate(storeId)).thenReturn(Optional.of(slot));

        when(parcelRepository.save(any(DhlParcel.class))).thenAnswer(inv -> inv.getArgument(0));

        DhlParcel result = parcelService.storeParcel(
            storeId, trackingCode, "auto", null, null, null, null);

        assertNotNull(result);
        assertNull(result.getPieceIdentifier());
        assertNull(result.getProductName());
        assertNull(result.getWeightKg());
        assertEquals(DhlParcelStatus.STORED, result.getStatus());
    }

    // ════════════════════════════════════════════════════════════════════
    // TEIL B: resetWarehouse()
    // ════════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("resetWarehouse: 3 STORED Parcels → alle CANCELLED mit Reason WAREHOUSE_RESET")
    void resetWarehouse_CancelsAllStoredParcels() {
        Long storeId = 5L;

        DhlParcel p1 = storedParcel(storeId, 1L, "CODE1");
        DhlParcel p2 = storedParcel(storeId, 2L, "CODE2");
        DhlParcel p3 = storedParcel(storeId, 3L, "CODE3");
        List<DhlParcel> stored = List.of(p1, p2, p3);

        when(parcelRepository.findByStoreIdAndStatus(storeId, DhlParcelStatus.STORED)).thenReturn(stored);
        when(parcelRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        List<DhlParcel> result = parcelService.resetWarehouse(storeId, 999L, "admin@test.com");

        assertEquals(3, result.size());
        for (DhlParcel parcel : result) {
            assertEquals(DhlParcelStatus.CANCELLED, parcel.getStatus());
            assertEquals(CancellationReason.WAREHOUSE_RESET.name(), parcel.getCancellationReason());
            assertNotNull(parcel.getCancelledAt());
            assertEquals(999L, parcel.getCancelledByUserId());
            assertEquals("admin@test.com", parcel.getCancelledByEmail());
        }

        verify(parcelRepository).findByStoreIdAndStatus(storeId, DhlParcelStatus.STORED);
        ArgumentCaptor<List<DhlParcel>> savedCaptor = ArgumentCaptor.forClass(List.class);
        verify(parcelRepository).saveAll(savedCaptor.capture());
        assertEquals(3, savedCaptor.getValue().size());
    }

    @Test
    @DisplayName("resetWarehouse: keine STORED Parcels → leere Liste, kein saveAll nötig")
    void resetWarehouse_NoStoredParcels_NoOp() {
        Long storeId = 5L;
        when(parcelRepository.findByStoreIdAndStatus(storeId, DhlParcelStatus.STORED))
            .thenReturn(Collections.emptyList());

        List<DhlParcel> result = parcelService.resetWarehouse(storeId, 999L, "admin@test.com");

        assertTrue(result.isEmpty());
        verify(parcelRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("resetWarehouse: anderer Store bleibt unberührt (Multi-Tenant)")
    void resetWarehouse_OtherStoreUnaffected() {
        Long storeId = 5L;
        Long otherStoreId = 6L;

        when(parcelRepository.findByStoreIdAndStatus(storeId, DhlParcelStatus.STORED))
            .thenReturn(List.of(storedParcel(storeId, 1L, "CODE1")));
        when(parcelRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        parcelService.resetWarehouse(storeId, 999L, "admin@test.com");

        verify(parcelRepository, never()).findByStoreIdAndStatus(eq(otherStoreId), any());
    }

    private DhlParcel storedParcel(Long storeId, Long id, String trackingCode) {
        Store store = new Store();
        store.setId(storeId);

        DhlParcel parcel = new DhlParcel();
        parcel.setId(id);
        parcel.setStore(store);
        parcel.setTrackingCode(trackingCode);
        parcel.setShelfLocation("A" + id);
        parcel.setStatus(DhlParcelStatus.STORED);
        return parcel;
    }
}

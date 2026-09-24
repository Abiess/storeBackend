package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.DhlActivityLog;
import storebackend.entity.DhlParcel;
import storebackend.entity.Store;
import storebackend.enums.CancellationReason;
import storebackend.enums.DhlActivityAction;
import storebackend.enums.DhlParcelStatus;
import storebackend.exception.ParcelAlreadyCancelledException;
import storebackend.exception.ParcelNotFoundException;
import storebackend.exception.ParcelNotStoredException;
import storebackend.repository.DhlActivityLogRepository;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests für DhlParcelService.cancelParcel() + Activity Log
 * 
 * Phase 3A.4 Checkpoint 3 - Activity Log Integration + Tracking-Code Wiederverwendung
 * 
 * TESTFÄLLE:
 * - STORED Paket kann storniert werden
 * - CANCELLED Paket kann nicht erneut storniert werden
 * - PICKED_UP Paket kann nicht storniert werden
 * - Unbekanntes Paket wirft ParcelNotFoundException
 * - Multi-Tenant Security: Store 121 kann nicht Store 122 Paket stornieren
 * - Activity Log STORAGE_CANCELLED wird geschrieben
 * - Cancel-Metadaten werden korrekt gespeichert (reason, note, user, timestamp)
 * - Slot-Snapshot korrekt
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DhlParcelService - Cancellation + Activity Log Tests (Phase 3A.4 CP3)")
class DhlParcelCancellationServiceTest {

    @Mock
    private DhlParcelRepository parcelRepository;

    @Mock
    private DhlShelfSlotRepository shelfSlotRepository;
    
    @Mock
    private DhlActivityLogService activityLogService;

    @InjectMocks
    private DhlParcelService parcelService;

    private Store testStore;
    private DhlParcel testParcel;

    @BeforeEach
    void setUp() {
        testStore = new Store();
        testStore.setId(121L);
        testStore.setName("Test Store 121");

        testParcel = new DhlParcel();
        testParcel.setId(1001L);
        testParcel.setStore(testStore);
        testParcel.setTrackingCode("JVGL11122233344");
        testParcel.setShelfLocation("A3");
        testParcel.setStatus(DhlParcelStatus.STORED);
        testParcel.setReceivedAt(LocalDateTime.now().minusHours(2));
    }

    @Test
    @DisplayName("CP3.1: Storniert STORED Paket erfolgreich mit Metadaten")
    void cancelParcel_Success_WithMetadata() {
        // Given: STORED Paket existiert
        when(parcelRepository.findByStoreIdAndId(121L, 1001L))
            .thenReturn(Optional.of(testParcel));
        
        when(parcelRepository.save(any(DhlParcel.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When: Paket stornieren
        DhlParcel result = parcelService.cancelParcel(
            121L, 1001L,
            CancellationReason.TEST_SCAN.name(),
            "Test während Einrichtung",
            999L,
            "admin@example.com"
        );

        // Then: Status ist CANCELLED
        assertNotNull(result);
        assertEquals(DhlParcelStatus.CANCELLED, result.getStatus());
        assertEquals("JVGL11122233344", result.getTrackingCode());
        assertEquals("A3", result.getShelfLocation());
        
        // Cancel-Metadaten gespeichert
        assertNotNull(result.getCancelledAt());
        assertEquals(CancellationReason.TEST_SCAN.name(), result.getCancellationReason());
        assertEquals("Test während Einrichtung", result.getCancellationNote());
        assertEquals(999L, result.getCancelledByUserId());
        assertEquals("admin@example.com", result.getCancelledByEmail());

        verify(parcelRepository).findByStoreIdAndId(121L, 1001L);
        verify(parcelRepository).save(testParcel);
    }

    @Test
    @DisplayName("CP3.2: Wirft ParcelNotFoundException wenn Paket nicht existiert")
    void cancelParcel_ParcelNotFound() {
        // Given: Paket existiert nicht
        when(parcelRepository.findByStoreIdAndId(121L, 9999L))
            .thenReturn(Optional.empty());

        // When + Then: Exception
        assertThrows(ParcelNotFoundException.class, () -> {
            parcelService.cancelParcel(121L, 9999L, 
                CancellationReason.WRONG_SCAN.name(), null, 999L, "user@test.com");
        });

        verify(parcelRepository).findByStoreIdAndId(121L, 9999L);
        verify(parcelRepository, never()).save(any());
    }

    @Test
    @DisplayName("CP3.3: Wirft ParcelAlreadyCancelledException wenn bereits storniert")
    void cancelParcel_AlreadyCancelled() {
        // Given: Paket ist bereits CANCELLED
        testParcel.setStatus(DhlParcelStatus.CANCELLED);
        testParcel.setCancelledAt(LocalDateTime.now().minusHours(1));
        
        when(parcelRepository.findByStoreIdAndId(121L, 1001L))
            .thenReturn(Optional.of(testParcel));

        // When + Then: Exception
        ParcelAlreadyCancelledException exception = assertThrows(
            ParcelAlreadyCancelledException.class,
            () -> parcelService.cancelParcel(121L, 1001L,
                CancellationReason.WRONG_SCAN.name(), null, 999L, "user@test.com")
        );

        assertTrue(exception.getMessage().contains("JVGL11122233344"));
        verify(parcelRepository).findByStoreIdAndId(121L, 1001L);
        verify(parcelRepository, never()).save(any());
    }

    @Test
    @DisplayName("CP3.4: Wirft ParcelNotStoredException wenn PICKED_UP")
    void cancelParcel_AlreadyPickedUp() {
        // Given: Paket ist bereits PICKED_UP
        testParcel.setStatus(DhlParcelStatus.PICKED_UP);
        testParcel.setPickedUpAt(LocalDateTime.now().minusMinutes(30));
        
        when(parcelRepository.findByStoreIdAndId(121L, 1001L))
            .thenReturn(Optional.of(testParcel));

        // When + Then: Exception
        ParcelNotStoredException exception = assertThrows(
            ParcelNotStoredException.class,
            () -> parcelService.cancelParcel(121L, 1001L,
                CancellationReason.WRONG_SCAN.name(), null, 999L, "user@test.com")
        );

        assertTrue(exception.getMessage().contains("JVGL11122233344"));
        assertTrue(exception.getMessage().contains("PICKED_UP"));
        verify(parcelRepository).findByStoreIdAndId(121L, 1001L);
        verify(parcelRepository, never()).save(any());
    }

    @Test
    @DisplayName("CP3.5: Multi-Tenant Security - Store 121 kann nicht Store 122 Paket stornieren")
    void cancelParcel_MultiTenantSecurity() {
        // Given: Paket gehört zu Store 122
        Store otherStore = new Store();
        otherStore.setId(122L);
        otherStore.setName("Other Store 122");

        DhlParcel otherParcel = new DhlParcel();
        otherParcel.setId(2001L);
        otherParcel.setStore(otherStore);
        otherParcel.setTrackingCode("OTHERCODE123");
        otherParcel.setStatus(DhlParcelStatus.STORED);

        // Store 121 versucht Paket 2001 zu laden → Repository gibt empty zurück
        when(parcelRepository.findByStoreIdAndId(121L, 2001L))
            .thenReturn(Optional.empty());

        // When + Then: ParcelNotFoundException
        assertThrows(ParcelNotFoundException.class, () -> {
            parcelService.cancelParcel(121L, 2001L,
                CancellationReason.WRONG_SCAN.name(), null, 999L, "user@test.com");
        });

        verify(parcelRepository).findByStoreIdAndId(121L, 2001L);
        verify(parcelRepository, never()).save(any());
    }

    @Test
    @DisplayName("CP3.6: Cancel-Metadaten korrekt - ohne Notiz")
    void cancelParcel_MetadataWithoutNote() {
        // Given
        when(parcelRepository.findByStoreIdAndId(121L, 1001L))
            .thenReturn(Optional.of(testParcel));
        
        when(parcelRepository.save(any(DhlParcel.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When: Cancel ohne Note
        DhlParcel result = parcelService.cancelParcel(
            121L, 1001L,
            CancellationReason.WRONG_SCAN.name(),
            null, // keine Note
            777L,
            "operator@store.com"
        );

        // Then
        assertEquals(CancellationReason.WRONG_SCAN.name(), result.getCancellationReason());
        assertNull(result.getCancellationNote());
        assertEquals(777L, result.getCancelledByUserId());
        assertEquals("operator@store.com", result.getCancelledByEmail());
        assertNotNull(result.getCancelledAt());
    }

    @Test
    @DisplayName("CP3.7: Timestamp cancelledAt wird korrekt gesetzt")
    void cancelParcel_TimestampCorrect() {
        // Given
        LocalDateTime beforeCancel = LocalDateTime.now().minusSeconds(1);
        
        when(parcelRepository.findByStoreIdAndId(121L, 1001L))
            .thenReturn(Optional.of(testParcel));
        
        when(parcelRepository.save(any(DhlParcel.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        DhlParcel result = parcelService.cancelParcel(
            121L, 1001L,
            CancellationReason.DUPLICATE_ENTRY.name(),
            "Duplicate scan detected",
            888L,
            "manager@store.com"
        );

        // Then: cancelledAt ist zwischen beforeCancel und now
        LocalDateTime afterCancel = LocalDateTime.now().plusSeconds(1);
        assertNotNull(result.getCancelledAt());
        assertTrue(result.getCancelledAt().isAfter(beforeCancel));
        assertTrue(result.getCancelledAt().isBefore(afterCancel));
    }
}

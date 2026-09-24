package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.DhlParcel;
import storebackend.entity.Store;
import storebackend.enums.DhlParcelStatus;
import storebackend.exception.ParcelAlreadyPickedUpException;
import storebackend.exception.ParcelNotFoundException;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.repository.StoreRepository;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests für den pickup-Lifecycle von DhlParcelService.
 *
 * Kontext (siehe DhlController.pickupParcel() Javadoc): die vormals
 * zusätzliche, erneute DHL-Tracking-Validierung VOR der Abholung wurde
 * entfernt - das Paket wurde bereits beim Einlagern authoritativ gegen DHL
 * bestätigt und liegt als vertrauenswürdiger DB-Datensatz vor. Die Abholung
 * ist daher rein lokal und läuft über ein bedingtes, atomares UPDATE
 * (DhlParcelRepository.markPickedUpIfStored() - "UPDATE ... WHERE status =
 * STORED"), das unter Nebenläufigkeit garantiert nur einmal erfolgreich ist,
 * statt eines read-then-write ("finden, dann speichern").
 *
 * Deckt ab:
 * - STORED -> PICKED_UP erfolgreich (UPDATE betrifft 1 Zeile)
 * - kein Datensatz zu diesem Tracking-Code -> 404 (UPDATE betrifft 0 Zeilen,
 *   Nachlade-Suche findet ebenfalls nichts)
 * - bereits PICKED_UP (z.B. Race mit einer parallelen, bereits committeten
 *   Abholung) -> 409 (UPDATE betrifft 0 Zeilen, Nachlade-Suche findet den
 *   inzwischen PICKED_UP-Datensatz)
 * - KEIN Aufruf einer externen DHL-API in diesem gesamten Flow (DhlParcelService
 *   kennt/injiziert gar keinen DhlTrackingClient).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DhlParcelService.pickupParcel - Lifecycle & atomares UPDATE")
class DhlParcelPickupLifecycleTest {

    @Mock
    private DhlParcelRepository parcelRepository;

    @Mock
    private DhlShelfSlotRepository slotRepository;

    @Mock
    private StoreRepository storeRepository;

    @InjectMocks
    private DhlParcelService parcelService;

    private static final Long STORE_ID = 77L;
    private static final String TRACKING_CODE = "JVGL0605379700518040";

    private DhlParcel parcelWithStatus(DhlParcelStatus status, LocalDateTime pickedUpAt) {
        Store store = new Store();
        store.setId(STORE_ID);

        DhlParcel parcel = new DhlParcel();
        parcel.setId(9L);
        parcel.setStore(store);
        parcel.setTrackingCode(TRACKING_CODE);
        parcel.setShelfLocation("A3");
        parcel.setStatus(status);
        parcel.setPickedUpAt(pickedUpAt);
        return parcel;
    }

    @Test
    @DisplayName("STORED -> PICKED_UP: atomares UPDATE betrifft 1 Zeile, Ergebnis wird frisch nachgeladen")
    void pickupParcel_Success_UpdatesAtomicallyAndReloadsResult() {
        when(parcelRepository.markPickedUpIfStored(eq(STORE_ID), eq(TRACKING_CODE), any(LocalDateTime.class)))
            .thenReturn(1);

        DhlParcel reloaded = parcelWithStatus(DhlParcelStatus.PICKED_UP, LocalDateTime.now());
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList()))
            .thenReturn(List.of(reloaded));

        DhlParcel result = parcelService.pickupParcel(STORE_ID, TRACKING_CODE);

        assertEquals(DhlParcelStatus.PICKED_UP, result.getStatus());
        assertEquals("A3", result.getShelfLocation());
        verify(parcelRepository).markPickedUpIfStored(eq(STORE_ID), eq(TRACKING_CODE), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("kein aktiver Datensatz -> ParcelNotFoundException, UPDATE betrifft 0 Zeilen")
    void pickupParcel_NoActiveParcel_ThrowsParcelNotFound() {
        when(parcelRepository.markPickedUpIfStored(eq(STORE_ID), eq(TRACKING_CODE), any(LocalDateTime.class)))
            .thenReturn(0);
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList()))
            .thenReturn(Collections.emptyList());

        assertThrows(ParcelNotFoundException.class,
            () -> parcelService.pickupParcel(STORE_ID, TRACKING_CODE));
    }

    @Test
    @DisplayName("bereits PICKED_UP -> ParcelAlreadyPickedUpException, UPDATE betrifft 0 Zeilen")
    void pickupParcel_AlreadyPickedUp_ThrowsParcelAlreadyPickedUp() {
        when(parcelRepository.markPickedUpIfStored(eq(STORE_ID), eq(TRACKING_CODE), any(LocalDateTime.class)))
            .thenReturn(0);

        DhlParcel alreadyPickedUp = parcelWithStatus(DhlParcelStatus.PICKED_UP, LocalDateTime.now().minusHours(1));
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList()))
            .thenReturn(List.of(alreadyPickedUp));

        assertThrows(ParcelAlreadyPickedUpException.class,
            () -> parcelService.pickupParcel(STORE_ID, TRACKING_CODE));
    }

    @Test
    @DisplayName("normalisiert den Tracking-Code identisch zu storeParcel/findParcel vor dem UPDATE")
    void pickupParcel_NormalizesTrackingCodeBeforeUpdate() {
        String rawCode = "(00)340434664988418341";
        String normalized = parcelService.normalizeTrackingCode(rawCode);

        when(parcelRepository.markPickedUpIfStored(eq(STORE_ID), eq(normalized), any(LocalDateTime.class)))
            .thenReturn(1);
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(normalized), anyList()))
            .thenReturn(List.of(parcelWithStatus(DhlParcelStatus.PICKED_UP, LocalDateTime.now())));

        parcelService.pickupParcel(STORE_ID, rawCode);

        verify(parcelRepository).markPickedUpIfStored(eq(STORE_ID), eq(normalized), any(LocalDateTime.class));
    }
}

package storebackend.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.DhlParcel;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.Store;
import storebackend.enums.DhlParcelStatus;
import storebackend.exception.ParcelAlreadyStoredException;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.repository.StoreRepository;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests für den store-Lifecycle von DhlParcelService (Bugfix: duplicate key
 * violation "ukbygu9t4xjbde5vx1c3p1aqr89" nach fälschlich wiederhergestelltem
 * unconditional Unique-Constraint auf (store_id, tracking_code) - siehe V020).
 *
 * WICHTIG (Session-Historie): Die ursprüngliche Implementierung nutzte einen
 * REQUIRES_NEW-TransactionTemplate-Insert als Race-Guard. Das wurde verworfen,
 * weil es im AUTO-Modus zu einem selbst erzeugten Application-Level-Deadlock
 * führen konnte: findNextFreeSlotForUpdate() hält einen PESSIMISTIC_WRITE
 * (FOR UPDATE) Lock auf die dhl_shelf_slots-Zeile in der äußeren Transaktion;
 * ein INSERT in dhl_parcels mit gesetztem shelf_slot_id fordert wegen des
 * FOREIGN KEY einen FOR KEY SHARE Lock auf genau dieser Zeile an - in einer
 * ZWEITEN (REQUIRES_NEW) Transaktion/Connection hätte das auf den Lock der
 * äußeren, synchron wartenden Transaktion gewartet (Self-Deadlock, von
 * Postgres' Deadlock-Detector nicht erkennbar).
 *
 * Aktuelle Lösung: EIN nativer INSERT mit "ON CONFLICT (store_id,
 * tracking_code) WHERE status IN ('STORED','PICKED_UP') DO NOTHING RETURNING
 * id" in der EINEN äußeren Transaktion (siehe DhlParcelService.
 * insertViaOnConflict()). Kein REQUIRES_NEW, keine zweite Connection, keine
 * DataIntegrityViolationException im Konfliktfall.
 *
 * Deckt ab:
 * - STORED-Erstinsert erfolgreich (native ON CONFLICT INSERT liefert 1 Zeile)
 * - STORED-Dublette -> 409 mit bestehendem Fach (Vorab-Check VOR dem Insert)
 * - PICKED_UP-Dublette -> 409 (bestehende fachliche Regel)
 * - CANCELLED -> erneute Einlagerung erfolgreich, Historie bleibt erhalten
 * - mehrere historische CANCELLED-Zeilen -> keine NonUniqueResultException
 * - ON CONFLICT liefert 0 Zeilen + aktiver STORED-Datensatz -> 409
 * - ON CONFLICT liefert 0 Zeilen + kein aktiver Datensatz -> technischer Fehler
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("DhlParcelService.storeParcel - Lifecycle & native ON CONFLICT Insert")
class DhlParcelStoreLifecycleTest {

    @Mock
    private DhlParcelRepository parcelRepository;

    @Mock
    private DhlShelfSlotRepository slotRepository;

    @Mock
    private StoreRepository storeRepository;

    @Mock
    private EntityManager entityManager;

    @Mock
    private Query nativeInsertQuery;

    @InjectMocks
    private DhlParcelService parcelService;

    private Store testStore;
    private static final Long STORE_ID = 121L;
    private static final String TRACKING_CODE = "JJD000390016573415932";

    @BeforeEach
    void setUp() {
        testStore = new Store();
        testStore.setId(STORE_ID);
        testStore.setName("Test Store");

        when(storeRepository.findById(STORE_ID)).thenReturn(Optional.of(testStore));

        // Nativer ON-CONFLICT-Insert läuft über EntityManager.createNativeQuery(...)
        // - kein TransactionTemplate/REQUIRES_NEW mehr im Store-Flow.
        // Mockitos @InjectMocks nutzt für DhlParcelService ausschließlich
        // Constructor-Injection (RequiredArgsConstructor-Felder) - das
        // @PersistenceContext-Feld "entityManager" wird dabei NICHT
        // automatisch mitgesetzt und muss daher explizit injiziert werden.
        org.springframework.test.util.ReflectionTestUtils.setField(parcelService, "entityManager", entityManager);

        lenient().when(entityManager.createNativeQuery(anyString())).thenReturn(nativeInsertQuery);
        lenient().when(nativeInsertQuery.setParameter(anyInt(), any())).thenReturn(nativeInsertQuery);
    }

    private DhlShelfSlot freeSlot(String code) {
        DhlShelfSlot slot = new DhlShelfSlot();
        slot.setId(1L);
        slot.setCode(code);
        return slot;
    }

    private DhlParcel existingParcel(Long id, DhlParcelStatus status, String shelf) {
        DhlParcel parcel = new DhlParcel();
        parcel.setId(id);
        parcel.setStore(testStore);
        parcel.setTrackingCode(TRACKING_CODE);
        parcel.setStatus(status);
        parcel.setShelfLocation(shelf);
        parcel.setReceivedAt(LocalDateTime.now().minusDays(1));
        if (status == DhlParcelStatus.PICKED_UP) {
            parcel.setPickedUpAt(LocalDateTime.now());
        }
        return parcel;
    }

    @Test
    @DisplayName("A) Erster STORED Insert ist erfolgreich (ON CONFLICT INSERT liefert generierte ID)")
    void storeParcel_FirstInsert_Succeeds() {
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList())).thenReturn(List.of());
        when(slotRepository.findNextFreeSlotForUpdate(STORE_ID)).thenReturn(Optional.of(freeSlot("A4")));
        when(nativeInsertQuery.getResultList()).thenReturn(List.of(555L));

        DhlParcel result = parcelService.storeParcel(STORE_ID, TRACKING_CODE, "auto", null, null, null, null);

        assertNotNull(result);
        assertEquals(555L, result.getId());
        assertEquals(DhlParcelStatus.STORED, result.getStatus());
        assertEquals("A4", result.getShelfLocation());
        verify(entityManager).createNativeQuery(contains("ON CONFLICT"));
        // KEIN JPA save()/saveAndFlush() auf dem transienten Objekt - sonst zweiter Insert.
        verify(parcelRepository, never()).save(any());
        verify(parcelRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("B) STORED-Dublette -> 409 ALREADY_STORED mit bestehendem Fach, kein Insert-Versuch")
    void storeParcel_AlreadyStored_Throws409WithExistingShelf() {
        DhlParcel existing = existingParcel(1L, DhlParcelStatus.STORED, "A4");
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList())).thenReturn(List.of(existing));

        ParcelAlreadyStoredException ex = assertThrows(ParcelAlreadyStoredException.class,
            () -> parcelService.storeParcel(STORE_ID, TRACKING_CODE, "auto", null, null, null, null));

        assertEquals("A4", ex.getDetails().get("slot"));
        // Vorab-Check in storeParcel() greift bereits VOR jedem Insert-Versuch.
        verify(entityManager, never()).createNativeQuery(anyString());
        verify(slotRepository, never()).findNextFreeSlotForUpdate(anyLong());
    }

    @Test
    @DisplayName("C) PICKED_UP-Dublette -> 409, kein erneutes Einlagern")
    void storeParcel_AlreadyPickedUp_Throws409() {
        DhlParcel existing = existingParcel(2L, DhlParcelStatus.PICKED_UP, "A4");
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList())).thenReturn(List.of(existing));

        assertThrows(ParcelAlreadyStoredException.class,
            () -> parcelService.storeParcel(STORE_ID, TRACKING_CODE, "auto", null, null, null, null));

        verify(entityManager, never()).createNativeQuery(anyString());
    }

    @Test
    @DisplayName("D) CANCELLED -> erneute Einlagerung erfolgreich, neuer STORED-Datensatz wird angelegt")
    void storeParcel_Cancelled_AllowsReStore() {
        // findActiveParcel filtert CANCELLED strukturell heraus -> Repository liefert leere Liste,
        // obwohl in der DB weiterhin ein CANCELLED-Datensatz für denselben Tracking-Code existiert.
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList())).thenReturn(List.of());
        when(slotRepository.findNextFreeSlotForUpdate(STORE_ID)).thenReturn(Optional.of(freeSlot("B2")));
        when(nativeInsertQuery.getResultList()).thenReturn(List.of(556L));

        DhlParcel result = parcelService.storeParcel(STORE_ID, TRACKING_CODE, "auto", null, null, null, null);

        assertNotNull(result);
        assertEquals(556L, result.getId());
        assertEquals(DhlParcelStatus.STORED, result.getStatus());
        assertEquals("B2", result.getShelfLocation());
        // Native Insert wurde genau einmal ausgeführt - eine bestehende CANCELLED-Zeile
        // wird von der App-Schicht nie berührt (kein UPDATE/DELETE auf sie ausgeführt).
        verify(entityManager, times(1)).createNativeQuery(anyString());
    }

    @Test
    @DisplayName("E) Mehrere historische CANCELLED-Zeilen -> keine NonUniqueResultException, Lookup bleibt sicher")
    void storeParcel_MultipleCancelledRows_NoNonUniqueResultException() {
        // Repository-Query ist bewusst auf ACTIVE_PARCEL_STATUSES (STORED/PICKED_UP) beschränkt -
        // mehrere CANCELLED-Zeilen in der DB werden von dieser Query gar nicht erst zurückgegeben.
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList())).thenReturn(List.of());
        when(slotRepository.findNextFreeSlotForUpdate(STORE_ID)).thenReturn(Optional.of(freeSlot("C1")));
        when(nativeInsertQuery.getResultList()).thenReturn(List.of(557L));

        assertDoesNotThrow(() ->
            parcelService.storeParcel(STORE_ID, TRACKING_CODE, "auto", null, null, null, null));
    }

    @Test
    @DisplayName("F) ON CONFLICT liefert 0 Zeilen + aktiver STORED-Datensatz -> sauberer 409, kein HTTP 500")
    void storeParcel_OnConflictZeroRows_ActiveParcelFound_Throws409() {
        // Vorab-Check (vor dem Insert-Versuch) findet noch nichts - der parallele
        // Request war zu diesem Zeitpunkt noch nicht committed. Der native INSERT
        // selbst liefert dann wegen ON CONFLICT DO NOTHING 0 Zeilen zurück (KEINE
        // Exception - das ist der Kern-Vorteil ggü. der früheren REQUIRES_NEW-Lösung).
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList()))
            .thenReturn(List.of()) // Vorab-Check in storeParcel()
            .thenReturn(List.of(existingParcel(3L, DhlParcelStatus.STORED, "D9"))); // Recovery-Check nach 0 Zeilen

        when(slotRepository.findNextFreeSlotForUpdate(STORE_ID)).thenReturn(Optional.of(freeSlot("D9")));
        when(nativeInsertQuery.getResultList()).thenReturn(Collections.emptyList());

        ParcelAlreadyStoredException ex = assertThrows(ParcelAlreadyStoredException.class,
            () -> parcelService.storeParcel(STORE_ID, TRACKING_CODE, "auto", null, null, null, null));

        assertEquals("D9", ex.getDetails().get("slot"));
        verify(parcelRepository, times(2)).findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList());
    }

    @Test
    @DisplayName("G) ON CONFLICT liefert 0 Zeilen OHNE erklärenden aktiven Datensatz -> technischer Fehler, kein Fake-Erfolg")
    void storeParcel_OnConflictZeroRows_NoActiveParcelFound_ThrowsTechnicalError() {
        when(parcelRepository.findByStoreIdAndTrackingCodeAndStatusInOrderByIdDesc(
            eq(STORE_ID), eq(TRACKING_CODE), anyList())).thenReturn(List.of());
        when(slotRepository.findNextFreeSlotForUpdate(STORE_ID)).thenReturn(Optional.of(freeSlot("E1")));
        when(nativeInsertQuery.getResultList()).thenReturn(Collections.emptyList());

        IllegalStateException ex = assertThrows(IllegalStateException.class,
            () -> parcelService.storeParcel(STORE_ID, TRACKING_CODE, "auto", null, null, null, null));

        assertTrue(ex.getMessage().contains(TRACKING_CODE));
    }
}

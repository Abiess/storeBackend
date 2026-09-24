package storebackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import storebackend.entity.DhlParcel;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.DhlParcelStatus;
import storebackend.service.DhlActivityLogService;
import storebackend.service.DhlParcelService;
import storebackend.service.dhl.DhlTrackingClient;
import storebackend.util.StoreAccessChecker;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * DHL Controller - Warehouse Reset Endpoint Tests (Teil B)
 *
 * POST /api/stores/{storeId}/dhl/warehouse/reset erfordert Store-Admin-Rechte
 * (nicht nur normalen Store-Zugriff) und protokolliert jedes betroffene Paket
 * einzeln als STORAGE_CANCELLED mit Reason WAREHOUSE_RESET.
 */
@ExtendWith(MockitoExtension.class)
class DhlControllerWarehouseResetTest {

    @Mock
    private DhlParcelService parcelService;

    @Mock
    private DhlActivityLogService activityLogService;

    @Mock
    private StoreAccessChecker storeAccessChecker;

    @Mock
    private DhlTrackingClient dhlTrackingClient;

    private DhlController dhlController;

    private User mockUser;

    @BeforeEach
    void setUp() {
        dhlController = new DhlController(
            parcelService,
            activityLogService,
            storeAccessChecker,
            dhlTrackingClient
        );

        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setEmail("admin@test.com");
    }

    private DhlParcel cancelledParcel(Long storeId, Long id, String trackingCode) {
        Store store = new Store();
        store.setId(storeId);

        DhlParcel parcel = new DhlParcel();
        parcel.setId(id);
        parcel.setStore(store);
        parcel.setTrackingCode(trackingCode);
        parcel.setShelfLocation("A" + id);
        parcel.setStatus(DhlParcelStatus.CANCELLED);
        return parcel;
    }

    @Test
    void testResetWarehouse_AdminUser_ResetsAndLogsEachParcel() {
        Long storeId = 5L;
        when(storeAccessChecker.isStoreAdmin(storeId)).thenReturn(true);

        List<DhlParcel> cancelled = List.of(
            cancelledParcel(storeId, 1L, "CODE1"),
            cancelledParcel(storeId, 2L, "CODE2"),
            cancelledParcel(storeId, 3L, "CODE3")
        );
        when(parcelService.resetWarehouse(storeId, mockUser.getId(), mockUser.getEmail()))
            .thenReturn(cancelled);

        ResponseEntity<?> response = dhlController.resetWarehouse(storeId, mockUser);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals(3, body.get("cancelledCount"));

        verify(activityLogService, times(3)).logStorageCancelled(
            eq(storeId), anyLong(), anyString(), anyString(),
            eq(mockUser.getId()), eq(mockUser.getEmail()),
            eq("WAREHOUSE_RESET"), anyString(), anyLong());
    }

    @Test
    void testResetWarehouse_NonAdmin_Denied() {
        Long storeId = 5L;
        when(storeAccessChecker.isStoreAdmin(storeId)).thenReturn(false);

        ResponseEntity<?> response = dhlController.resetWarehouse(storeId, mockUser);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(parcelService, never()).resetWarehouse(anyLong(), anyLong(), anyString());
        verify(activityLogService, never()).logStorageCancelled(
            anyLong(), anyLong(), anyString(), anyString(), anyLong(), anyString(), anyString(), any(), anyLong());
    }

    @Test
    void testResetWarehouse_NotAuthenticated_Denied() {
        Long storeId = 5L;

        ResponseEntity<?> response = dhlController.resetWarehouse(storeId, null);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(storeAccessChecker, never()).isStoreAdmin(anyLong());
        verify(parcelService, never()).resetWarehouse(anyLong(), anyLong(), anyString());
    }
}

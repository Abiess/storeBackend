package storebackend.service.admin;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import storebackend.dto.admin.AdminEntitlementDTO;
import storebackend.dto.admin.AdminUserEntitlementsDTO;
import storebackend.dto.admin.UpsertEntitlementRequest;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.entity.UserAppEntitlement;
import storebackend.enums.AppAccessMode;
import storebackend.enums.AppKey;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserAppEntitlementRepository;
import storebackend.repository.UserRepository;
import storebackend.util.AppAccessChecker;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * App Provisioning Phase 1 - deckt die vom Auftrag geforderte
 * Validierungsmatrix ab:
 * 1. LEGACY-User ohne Entitlements -> Anzeige LEGACY
 * 2. Erstes Entitlement hinzufügen -> User wird MANAGED
 * 3. STORE-App ohne storeId -> abgelehnt
 * 4. GLOBAL-App mit storeId -> abgelehnt
 * 5. Entitlement deaktivieren -> enabled=false
 * (Rollen-/403-Prüfung erfolgt ausschließlich über
 * {@code @PreAuthorize} im Controller.)
 */
class AppProvisioningServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private StoreRepository storeRepository;
    @Mock
    private UserAppEntitlementRepository userAppEntitlementRepository;
    @Mock
    private AppAccessChecker appAccessChecker;

    @InjectMocks
    private AppProvisioningService service;

    private User user;
    private Store store;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        user = new User();
        user.setId(1L);
        user.setEmail("owner@example.com");
        user.setName("Owner");

        store = new Store();
        store.setId(121L);
        store.setName("Store 121");
    }

    @Test
    void getUserEntitlements_legacyUserWithoutEntitlements_showsLegacyMode() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userAppEntitlementRepository.findByUserId(1L)).thenReturn(List.of());
        when(appAccessChecker.getAccessMode(1L)).thenReturn(AppAccessMode.LEGACY);

        AdminUserEntitlementsDTO result = service.getUserEntitlements(1L);

        assertEquals(AppAccessMode.LEGACY, result.getAppAccessMode());
        assertTrue(result.getEntitlements().isEmpty());
    }

    @Test
    void upsertEntitlement_firstEntitlementForLegacyUser_isPersistedAndReflectsManagedAfterwards() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(storeRepository.findById(121L)).thenReturn(Optional.of(store));
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreId(1L, AppKey.SHOP, 121L))
                .thenReturn(Optional.empty());
        when(userAppEntitlementRepository.save(any(UserAppEntitlement.class)))
                .thenAnswer(invocation -> {
                    UserAppEntitlement e = invocation.getArgument(0);
                    e.setId(99L);
                    return e;
                });

        UpsertEntitlementRequest request = new UpsertEntitlementRequest(AppKey.SHOP, 121L, true);
        AdminEntitlementDTO result = service.upsertEntitlement(1L, request);

        assertEquals(99L, result.getId());
        assertEquals(AppKey.SHOP, result.getApp());
        assertEquals(121L, result.getStoreId());
        assertTrue(result.isEnabled());
        verify(userAppEntitlementRepository).save(any(UserAppEntitlement.class));

        // Nach dem ersten Entitlement muss der userweite Modus MANAGED sein
        // (verifiziert, dass AppAccessChecker - unverändert - diese Sicht hätte).
        when(userAppEntitlementRepository.existsByUserId(1L)).thenReturn(true);
        assertEquals(AppAccessMode.MANAGED, new AppAccessChecker(userAppEntitlementRepository).getAccessMode(1L));
    }

    @Test
    void upsertEntitlement_storeAppWithoutStoreId_isRejected() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        UpsertEntitlementRequest request = new UpsertEntitlementRequest(AppKey.SHOP, null, true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.upsertEntitlement(1L, request));
        assertTrue(ex.getMessage().contains("storeId"));
        verify(userAppEntitlementRepository, never()).save(any());
    }

    @Test
    void upsertEntitlement_globalAppWithStoreId_isRejected() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        UpsertEntitlementRequest request = new UpsertEntitlementRequest(AppKey.MARITIME, 121L, true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.upsertEntitlement(1L, request));
        assertTrue(ex.getMessage().contains("storeId"));
        verify(userAppEntitlementRepository, never()).save(any());
    }

    @Test
    void upsertEntitlement_globalAppWithoutStoreId_isAccepted() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreIdIsNull(1L, AppKey.MARITIME))
                .thenReturn(Optional.empty());
        when(userAppEntitlementRepository.save(any(UserAppEntitlement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        UpsertEntitlementRequest request = new UpsertEntitlementRequest(AppKey.MARITIME, null, true);
        AdminEntitlementDTO result = service.upsertEntitlement(1L, request);

        assertNull(result.getStoreId());
        assertEquals(AppKey.MARITIME, result.getApp());
        verify(storeRepository, never()).findById(any());
    }

    @Test
    void upsertEntitlement_unknownUser_throwsNoSuchElement() {
        when(userRepository.findById(42L)).thenReturn(Optional.empty());
        UpsertEntitlementRequest request = new UpsertEntitlementRequest(AppKey.SHOP, 121L, true);

        assertThrows(NoSuchElementException.class, () -> service.upsertEntitlement(42L, request));
    }

    @Test
    void patchEnabled_disablesExistingEntitlement() {
        UserAppEntitlement entitlement = new UserAppEntitlement();
        entitlement.setId(5L);
        entitlement.setUser(user);
        entitlement.setApp(AppKey.SHOP);
        entitlement.setStore(store);
        entitlement.setEnabled(true);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userAppEntitlementRepository.findById(5L)).thenReturn(Optional.of(entitlement));
        when(userAppEntitlementRepository.save(any(UserAppEntitlement.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        AdminEntitlementDTO result = service.patchEnabled(1L, 5L, false);

        assertFalse(result.isEnabled());
        verify(userAppEntitlementRepository).save(argThat(e -> !e.isEnabled()));
    }

    @Test
    void patchEnabled_entitlementBelongsToOtherUser_isRejected() {
        User otherUser = new User();
        otherUser.setId(2L);

        UserAppEntitlement entitlement = new UserAppEntitlement();
        entitlement.setId(5L);
        entitlement.setUser(otherUser);
        entitlement.setApp(AppKey.SHOP);

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userAppEntitlementRepository.findById(5L)).thenReturn(Optional.of(entitlement));

        assertThrows(IllegalArgumentException.class, () -> service.patchEnabled(1L, 5L, false));
        verify(userAppEntitlementRepository, never()).save(any());
    }
}

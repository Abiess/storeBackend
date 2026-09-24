package storebackend.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.entity.UserAppEntitlement;
import storebackend.enums.AppAccessMode;
import storebackend.enums.AppKey;
import storebackend.repository.UserAppEntitlementRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests für {@link AppAccessChecker} (App-Entitlement-Konzept, Phase 1).
 *
 * KRITISCH: Verifiziert die userweite LEGACY/MANAGED-Logik und die
 * Scope-Konsistenz (STORE vs. GLOBAL) - siehe finaler Plan:
 * - kein Entitlement für User überhaupt -> LEGACY -> hasAppAccess() == true
 * - mindestens ein Entitlement -> MANAGED -> nur explizit passender
 *   enabled=true-Eintrag erlaubt, alles andere false
 */
@ExtendWith(MockitoExtension.class)
class AppAccessCheckerTest {

    @Mock
    private UserAppEntitlementRepository userAppEntitlementRepository;

    @InjectMocks
    private AppAccessChecker appAccessChecker;

    private static final Long USER_ID = 1L;
    private static final Long STORE_A_ID = 10L;
    private static final Long STORE_B_ID = 20L;

    private UserAppEntitlement entitlement(AppKey app, Long storeId, boolean enabled) {
        UserAppEntitlement entitlement = new UserAppEntitlement();
        entitlement.setId(1L);

        User user = new User();
        user.setId(USER_ID);
        entitlement.setUser(user);

        if (storeId != null) {
            Store store = new Store();
            store.setId(storeId);
            entitlement.setStore(store);
        }

        entitlement.setApp(app);
        entitlement.setEnabled(enabled);
        return entitlement;
    }

    @Test
    @DisplayName("LEGACY: User ohne jeden Entitlement-Eintrag -> Zugriff auf ALLE Apps bleibt wie bisher (true)")
    void legacyMode_noEntitlementsAtAll_allowsAllApps() {
        when(userAppEntitlementRepository.existsByUserId(USER_ID)).thenReturn(false);

        assertEquals(AppAccessMode.LEGACY, appAccessChecker.getAccessMode(USER_ID));

        assertTrue(appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.SHOP));
        assertTrue(appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.DHL));
        assertTrue(appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.LOYALTY));
        assertTrue(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.MARITIME));
        assertTrue(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.ISSUE_ANALYSIS));

        // LEGACY darf keine Repository-Lookups auf konkrete Einträge durchführen
        verify(userAppEntitlementRepository, never()).findByUserIdAndAppAndStoreId(any(), any(), any());
        verify(userAppEntitlementRepository, never()).findByUserIdAndAppAndStoreIdIsNull(any(), any());
    }

    @Test
    @DisplayName("MANAGED: nur DHL(Store A)=true vorhanden -> DHL(Store A) erlaubt, alle anderen Apps gesperrt")
    void managedMode_onlyDhlStoreAEnabled_otherAppsAreDenied() {
        when(userAppEntitlementRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreId(USER_ID, AppKey.DHL, STORE_A_ID))
            .thenReturn(Optional.of(entitlement(AppKey.DHL, STORE_A_ID, true)));
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreId(eq(USER_ID), eq(AppKey.SHOP), any()))
            .thenReturn(Optional.empty());
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreId(eq(USER_ID), eq(AppKey.LOYALTY), any()))
            .thenReturn(Optional.empty());
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreIdIsNull(USER_ID, AppKey.MARITIME))
            .thenReturn(Optional.empty());
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreIdIsNull(USER_ID, AppKey.ISSUE_ANALYSIS))
            .thenReturn(Optional.empty());

        assertEquals(AppAccessMode.MANAGED, appAccessChecker.getAccessMode(USER_ID));

        assertTrue(appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.DHL));

        assertFalse(appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.SHOP));
        assertFalse(appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.LOYALTY));
        assertFalse(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.MARITIME));
        assertFalse(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.ISSUE_ANALYSIS));
    }

    @Test
    @DisplayName("MANAGED: DHL nur für Store A erlaubt -> Store B derselben App bleibt gesperrt")
    void managedMode_dhlEnabledOnlyForStoreA_storeBIsDenied() {
        when(userAppEntitlementRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreId(USER_ID, AppKey.DHL, STORE_A_ID))
            .thenReturn(Optional.of(entitlement(AppKey.DHL, STORE_A_ID, true)));
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreId(USER_ID, AppKey.DHL, STORE_B_ID))
            .thenReturn(Optional.empty());

        assertTrue(appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.DHL));
        assertFalse(appAccessChecker.hasAppAccess(USER_ID, STORE_B_ID, AppKey.DHL));
    }

    @Test
    @DisplayName("MANAGED: expliziter Eintrag mit enabled=false -> Zugriff bleibt gesperrt")
    void managedMode_explicitlyDisabledEntry_isDenied() {
        when(userAppEntitlementRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreId(USER_ID, AppKey.DHL, STORE_A_ID))
            .thenReturn(Optional.of(entitlement(AppKey.DHL, STORE_A_ID, false)));

        assertFalse(appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.DHL));
    }

    @Test
    @DisplayName("MANAGED: GLOBAL-App (MARITIME) mit store=null wird korrekt über die Null-Store-Methode geprüft")
    void managedMode_globalAppWithNullStore_usesNullStoreLookup() {
        when(userAppEntitlementRepository.existsByUserId(USER_ID)).thenReturn(true);
        when(userAppEntitlementRepository.findByUserIdAndAppAndStoreIdIsNull(USER_ID, AppKey.MARITIME))
            .thenReturn(Optional.of(entitlement(AppKey.MARITIME, null, true)));

        assertTrue(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.MARITIME));
        verify(userAppEntitlementRepository).findByUserIdAndAppAndStoreIdIsNull(USER_ID, AppKey.MARITIME);
        verify(userAppEntitlementRepository, never()).findByUserIdAndAppAndStoreId(any(), any(), any());
    }

    @Test
    @DisplayName("Scope-Verletzung: GLOBAL-App (MARITIME) mit gesetzter storeId wird abgewiesen")
    void globalAppWithStoreId_isRejected() {
        assertThrows(IllegalArgumentException.class,
            () -> appAccessChecker.hasAppAccess(USER_ID, STORE_A_ID, AppKey.MARITIME));
    }

    @Test
    @DisplayName("Scope-Verletzung: STORE-App (DHL) ohne storeId wird abgewiesen")
    void storeAppWithoutStoreId_isRejected() {
        assertThrows(IllegalArgumentException.class,
            () -> appAccessChecker.hasAppAccess(USER_ID, null, AppKey.DHL));
    }
}

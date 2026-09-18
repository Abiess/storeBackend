package storebackend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.AppEntitlementDTO;
import storebackend.dto.AuthResponse;
import storebackend.dto.LoginRequest;
import storebackend.dto.admin.AdminEntitlementDTO;
import storebackend.dto.admin.AdminUserEntitlementsDTO;
import storebackend.dto.admin.UpsertEntitlementRequest;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.AppAccessMode;
import storebackend.enums.AppKey;
import storebackend.enums.CurrencyCode;
import storebackend.enums.PriceMode;
import storebackend.enums.Role;
import storebackend.repository.PlanRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.service.AuthService;
import storebackend.service.admin.AppProvisioningService;
import storebackend.util.AppAccessChecker;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * PLATFORM PROVISIONING - END-TO-END SMOKE TEST (Testmatrix laut Auftrag).
 *
 * Beweist die komplette Kette OHNE direkte SQL-Inserts (Entitlements werden
 * ausschließlich über {@link AppProvisioningService} gesetzt - dieselbe
 * Service-Klasse, die vom Platform-Admin-Controller
 * {@code AppProvisioningController} verwendet wird):
 *
 * Platform Admin (AppProvisioningService.upsertEntitlement/patchEnabled)
 *   -> User loggt sich neu ein (AuthService.login, echte Passwort-Prüfung
 *      über AuthenticationManager + PasswordEncoder)
 *   -> AuthResponse enthält appAccessMode (LEGACY/MANAGED) + apps[] (Rohliste)
 *   -> Backend @RequiresApp/AppAccessInterceptor erlaubt/verweigert echten
 *      HTTP-Zugriff auf reale, bereits bestehende Controller-Endpunkte
 *      (DhlController, LoyaltyController, StoreBannerController,
 *      MaritimeController) via MockMvc mit einem ECHTEN JWT.
 *
 * Die Frontend-Teile (Launcher /apps, ContextSelector /apps/dhl,
 * buildAppHomeUrl/resolveAppEntryUrl) können aus einem reinen
 * Backend-Test heraus nicht real navigiert werden - stattdessen wird hier
 * exakt die Datengrundlage geprüft, die diese Komponenten konsumieren
 * (AuthResponse.apps / AdminUserEntitlementsDTO.entitlements), siehe
 * Testbericht für die manuelle Frontend-Verifikation dieser Session.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProvisioningEndToEndSmokeTest {

    private static final String RAW_PASSWORD = "SmokeTest#12345";

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private StoreRepository storeRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuthService authService;
    @Autowired private AppProvisioningService appProvisioningService;
    @Autowired private AppAccessChecker appAccessChecker;
    @Autowired private ObjectMapper objectMapper;

    private User testUser;
    private Store store121;
    private Store store122;

    @BeforeEach
    void setUp() {
        testUser = createUser();
        store121 = createStore(testUser, "121");
        store122 = createStore(testUser, "122");
    }

    // ------------------------------------------------------------------
    // TEST 1: LEGACY-User -> keine Entitlements -> bisheriges Verhalten
    // ------------------------------------------------------------------
    @Test
    @DisplayName("TEST 1: LEGACY-User ohne Entitlements - AuthResponse=LEGACY, voller Zugriff unverändert")
    void test1_legacyUser_unchangedBehaviour() throws Exception {
        AuthResponse response = login();

        assertEquals(AppAccessMode.LEGACY, response.getUser().getAppAccessMode());
        assertTrue(response.getUser().getApps().isEmpty());

        // AppAccessChecker: LEGACY = permissiv für ALLE Apps (Store- und Global-Scope)
        assertTrue(appAccessChecker.hasAppAccess(testUser.getId(), store121.getId(), AppKey.DHL));
        assertTrue(appAccessChecker.hasAppAccess(testUser.getId(), store121.getId(), AppKey.SHOP));
        assertTrue(appAccessChecker.hasAppAccess(testUser.getId(), store121.getId(), AppKey.LOYALTY));
        assertTrue(appAccessChecker.hasAppAccess(testUser.getId(), null, AppKey.MARITIME));

        // Reale HTTP-Zugriffe: @RequiresApp lässt LEGACY-User überall durch
        mockMvc.perform(get("/api/stores/{storeId}/dhl/parcels/count", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/maritime/status").header("Authorization", bearer()))
                .andExpect(status().isOk());
    }

    // ------------------------------------------------------------------
    // TEST 2: erstes Entitlement DHL/121 -> MANAGED, DHL erlaubt, Rest verboten
    // ------------------------------------------------------------------
    @Test
    @DisplayName("TEST 2: erstes Entitlement DHL/121 -> User wird MANAGED, nur DHL/121 erlaubt")
    void test2_firstEntitlement_dhl121_makesUserManagedAndScoped() throws Exception {
        upsert(AppKey.DHL, store121.getId());

        AuthResponse response = login();
        assertEquals(AppAccessMode.MANAGED, response.getUser().getAppAccessMode());
        assertEquals(1, response.getUser().getApps().size());
        AppEntitlementDTO entitlement = response.getUser().getApps().get(0);
        assertEquals(AppKey.DHL, entitlement.getApp());
        assertEquals(store121.getId(), entitlement.getStoreId());
        assertTrue(entitlement.isEnabled());

        // DHL/121 erlaubt
        mockMvc.perform(get("/api/stores/{storeId}/dhl/parcels/count", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());

        // SHOP, LOYALTY, MARITIME NICHT erlaubt (403 vom AppAccessInterceptor)
        mockMvc.perform(get("/api/stores/{storeId}/banner", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/stores/{storeId}/loyalty/accounts", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/maritime/status").header("Authorization", bearer()))
                .andExpect(status().isForbidden());

        // DHL an einem ANDEREN Store (122) ist NICHT automatisch miterlaubt
        assertFalse(appAccessChecker.hasAppAccess(testUser.getId(), store122.getId(), AppKey.DHL));
    }

    // ------------------------------------------------------------------
    // TEST 3: DHL/121 + DHL/122 -> beide Contexts verfügbar (Context Selector)
    // ------------------------------------------------------------------
    @Test
    @DisplayName("TEST 3: DHL an 2 Stores -> beide Contexts in Entitlement-Datengrundlage des Context Selectors")
    void test3_dhlTwoStores_bothContextsAvailable() throws Exception {
        upsert(AppKey.DHL, store121.getId());
        upsert(AppKey.DHL, store122.getId());

        AdminUserEntitlementsDTO admin = appProvisioningService.getUserEntitlements(testUser.getId());
        List<Long> dhlStoreIds = admin.getEntitlements().stream()
                .filter(e -> e.getApp() == AppKey.DHL)
                .map(AdminEntitlementDTO::getStoreId)
                .sorted()
                .collect(Collectors.toList());
        assertEquals(List.of(store121.getId(), store122.getId()), dhlStoreIds);

        assertTrue(appAccessChecker.hasAppAccess(testUser.getId(), store121.getId(), AppKey.DHL));
        assertTrue(appAccessChecker.hasAppAccess(testUser.getId(), store122.getId(), AppKey.DHL));

        mockMvc.perform(get("/api/stores/{storeId}/dhl/parcels/count", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/stores/{storeId}/dhl/parcels/count", store122.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());
    }

    // ------------------------------------------------------------------
    // TEST 4: DHL + MARITIME -> beide Apps sichtbar (Launcher-Datengrundlage)
    // ------------------------------------------------------------------
    @Test
    @DisplayName("TEST 4: DHL + MARITIME -> beide Apps in AuthResponse.apps (Launcher-Datengrundlage)")
    void test4_dhlAndMaritime_bothAppsVisible() throws Exception {
        upsert(AppKey.DHL, store121.getId());
        upsertGlobal(AppKey.MARITIME);

        AuthResponse response = login();
        Set<AppKey> apps = response.getUser().getApps().stream()
                .map(AppEntitlementDTO::getApp)
                .collect(Collectors.toSet());
        assertEquals(Set.of(AppKey.DHL, AppKey.MARITIME), apps);

        mockMvc.perform(get("/api/stores/{storeId}/dhl/parcels/count", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/maritime/status").header("Authorization", bearer()))
                .andExpect(status().isOk());
    }

    // ------------------------------------------------------------------
    // TEST 5: SHOP + LOYALTY + DHL -> alle drei STORE-Apps sichtbar
    // ------------------------------------------------------------------
    @Test
    @DisplayName("TEST 5: SHOP + LOYALTY + DHL -> alle drei STORE-Apps korrekt kontextgebunden erlaubt")
    void test5_allThreeStoreApps_correctlyScoped() throws Exception {
        upsert(AppKey.SHOP, store121.getId());
        upsert(AppKey.LOYALTY, store121.getId());
        upsert(AppKey.DHL, store121.getId());

        AuthResponse response = login();
        Set<AppKey> apps = response.getUser().getApps().stream()
                .map(AppEntitlementDTO::getApp)
                .collect(Collectors.toSet());
        assertEquals(Set.of(AppKey.SHOP, AppKey.LOYALTY, AppKey.DHL), apps);

        mockMvc.perform(get("/api/stores/{storeId}/banner", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/stores/{storeId}/loyalty/accounts", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/stores/{storeId}/dhl/parcels/count", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());

        // MARITIME ist NICHT freigeschaltet -> weiterhin verboten
        mockMvc.perform(get("/api/maritime/status").header("Authorization", bearer()))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------
    // TEST 6: Soft-Disable -> Zugriff sofort weg, Backend liefert 403
    // ------------------------------------------------------------------
    @Test
    @DisplayName("TEST 6: enabled=false (Soft-Disable) -> kein Zugriff mehr, Backend liefert 403")
    void test6_softDisable_revokesAccessImmediately() throws Exception {
        AdminEntitlementDTO created = upsert(AppKey.DHL, store121.getId());

        // Vorher: Zugriff erlaubt
        mockMvc.perform(get("/api/stores/{storeId}/dhl/parcels/count", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isOk());

        // Platform-Admin deaktiviert das Entitlement (Soft-Disable, kein Löschen)
        AdminEntitlementDTO disabled = appProvisioningService.patchEnabled(testUser.getId(), created.getId(), false);
        assertFalse(disabled.isEnabled());

        // Nach Reload/erneutem Login spiegelt AuthResponse enabled=false wider
        AuthResponse response = login();
        assertFalse(response.getUser().getApps().get(0).isEnabled());

        // Backend muss den Zugriff SOFORT verweigern (403) - unabhängig vom
        // (bereits ausgestellten) JWT, da die Prüfung serverseitig pro Request erfolgt
        assertFalse(appAccessChecker.hasAppAccess(testUser.getId(), store121.getId(), AppKey.DHL));
        mockMvc.perform(get("/api/stores/{storeId}/dhl/parcels/count", store121.getId()).header("Authorization", bearer()))
                .andExpect(status().isForbidden());
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private AdminEntitlementDTO upsert(AppKey app, Long storeId) {
        return appProvisioningService.upsertEntitlement(testUser.getId(), new UpsertEntitlementRequest(app, storeId, true));
    }

    private AdminEntitlementDTO upsertGlobal(AppKey app) {
        return appProvisioningService.upsertEntitlement(testUser.getId(), new UpsertEntitlementRequest(app, null, true));
    }

    /** Echter Login-Durchlauf über AuthService (Passwort-Prüfung via AuthenticationManager). */
    private AuthResponse login() {
        LoginRequest request = new LoginRequest();
        request.setEmail(testUser.getEmail());
        request.setPassword(RAW_PASSWORD);
        return authService.login(request);
    }

    private String bearer() {
        return "Bearer " + jwtUtil.generateToken(testUser.getEmail(), testUser.getId(), testUser.getRoles());
    }

    private User createUser() {
        User user = new User();
        user.setEmail("smoke-" + System.nanoTime() + "@example.com");
        user.setPasswordHash(passwordEncoder.encode(RAW_PASSWORD));
        user.setName("Smoke Test User");
        user.setEmailVerified(true);
        Set<Role> roles = new HashSet<>();
        roles.add(Role.USER);
        user.setRoles(roles);
        planRepository.findByName("FREE").ifPresent(user::setPlan);
        return userRepository.save(user);
    }

    private Store createStore(User owner, String suffix) {
        Store store = new Store();
        store.setName("Smoke Store " + suffix + " " + System.nanoTime());
        store.setSlug("smoke-" + suffix + "-" + System.nanoTime());
        store.setOwner(owner);
        store.setCountryCode("DE");
        store.setCurrencyCode(CurrencyCode.EUR);
        store.setPriceMode(PriceMode.GROSS);
        store.setVatEnabled(true);
        return storeRepository.save(store);
    }
}

package storebackend.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerMapping;
import storebackend.entity.DhlParcel;
import storebackend.entity.DhlShelfSlot;
import storebackend.entity.Order;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.AppKey;
import storebackend.enums.AppScopeSource;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.repository.OrderRepository;
import storebackend.util.AppAccessChecker;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit-Tests für {@link AppAccessInterceptor} (Phase 3: Backend App-Isolation).
 *
 * Verifiziert die zusätzliche äußere Schranke "App-Zugriff" (Architektur:
 * Auth/JWT -&gt; @RequiresApp/AppAccessInterceptor -&gt; StoreAccessChecker/Rollen -&gt; Businesslogik).
 *
 * Deckt konkret die im Auftrag geforderte Sicherheitsmatrix für einen
 * MANAGED-User mit DHL=true/storeId=121 ab, sowie die Scope-Auflösung
 * (STORE_ID_PARAM / ORDER_ID_PARAM / DHL_PARCEL_ID_PARAM / DHL_SLOT_ID_PARAM / NONE)
 * und den Sicherheitsgrundsatz "Scope nicht auflösbar -&gt; DENY".
 */
@ExtendWith(MockitoExtension.class)
class AppAccessInterceptorTest {

    @Mock
    private AppAccessChecker appAccessChecker;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private DhlParcelRepository dhlParcelRepository;
    @Mock
    private DhlShelfSlotRepository dhlShelfSlotRepository;

    private AppAccessInterceptor interceptor;

    private static final Long USER_ID = 1L;
    private static final Long STORE_121 = 121L;
    private static final Long STORE_122 = 122L;

    // ---- Test-Handler-Klassen mit @RequiresApp (spiegeln die realen Annotierungen) ----

    @RequiresApp(AppKey.DHL)
    static class DhlStoreScopedHandler {
        public void handle() { /* no-op */ }
    }

    @RequiresApp(AppKey.SHOP)
    static class ShopStoreScopedHandler {
        public void handle() { /* no-op */ }
    }

    @RequiresApp(AppKey.LOYALTY)
    static class LoyaltyStoreScopedHandler {
        public void handle() { /* no-op */ }
    }

    @RequiresApp(value = AppKey.MARITIME, scope = AppScopeSource.NONE)
    static class MaritimeGlobalHandler {
        public void handle() { /* no-op */ }
    }

    @RequiresApp(value = AppKey.ISSUE_ANALYSIS, scope = AppScopeSource.NONE)
    static class IssueAnalysisGlobalHandler {
        public void handle() { /* no-op */ }
    }

    static class NoAnnotationHandler {
        public void handle() { /* no-op, e.g. PLATFORM_SHARED/PUBLIC */ }
    }

    static class OrderScopedHandler {
        // Spiegelt DhlAdminController.validateShipment/createLabel (SHOP, orderId-Scope)
        @RequiresApp(value = AppKey.SHOP, scope = AppScopeSource.ORDER_ID_PARAM)
        public void handle() { /* no-op */ }
    }

    static class ParcelScopedHandler {
        @RequiresApp(value = AppKey.DHL, scope = AppScopeSource.DHL_PARCEL_ID_PARAM)
        public void handle() { /* no-op */ }
    }

    static class SlotScopedHandler {
        @RequiresApp(value = AppKey.DHL, scope = AppScopeSource.DHL_SLOT_ID_PARAM)
        public void handle() { /* no-op */ }
    }

    @BeforeEach
    void setUp() {
        interceptor = new AppAccessInterceptor(
                appAccessChecker, orderRepository, dhlParcelRepository, dhlShelfSlotRepository, new ObjectMapper());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private HandlerMethod handlerMethodOf(Class<?> clazz) throws Exception {
        Method method = clazz.getMethod("handle");
        return new HandlerMethod(clazz.getDeclaredConstructor().newInstance(), method);
    }

    private void authenticateAsUser(Long userId) {
        User user = new User();
        user.setId(userId);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
    }

    private HttpServletRequest requestWithPathVariables(Map<String, String> vars) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE)).thenReturn(vars);
        return request;
    }

    private HttpServletRequest requestWithoutPathVariables() {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE)).thenReturn(null);
        return request;
    }

    private StringWriter captureResponseBody(HttpServletResponse response) throws Exception {
        StringWriter sw = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(sw));
        return sw;
    }

    // ════════════════════════════════════════════════════════════════
    // Geforderte Sicherheitsmatrix: MANAGED, DHL=true, storeId=121
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("MANAGED DHL=true/Store121: DHL-Paketshop-API Store 121 -> ALLOW")
    void managedDhl_store121_allow() throws Exception {
        authenticateAsUser(USER_ID);
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_121, AppKey.DHL)).thenReturn(true);

        HttpServletRequest request = requestWithPathVariables(Map.of("storeId", "121"));
        HttpServletResponse response = mock(HttpServletResponse.class);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(DhlStoreScopedHandler.class));

        assertTrue(result);
        verify(response, never()).setStatus(anyInt());
    }

    @Test
    @DisplayName("MANAGED DHL=true/Store121: DHL-Paketshop-API Store 122 -> DENY (403 APP_ACCESS_DENIED)")
    void managedDhl_store122_deny() throws Exception {
        authenticateAsUser(USER_ID);
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_122, AppKey.DHL)).thenReturn(false);

        HttpServletRequest request = requestWithPathVariables(Map.of("storeId", "122"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        StringWriter body = captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(DhlStoreScopedHandler.class));

        assertFalse(result);
        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        assertTrue(body.toString().contains("\"code\":\"APP_ACCESS_DENIED\""));
        assertTrue(body.toString().contains("\"app\":\"DHL\""));
        assertTrue(body.toString().contains("Access to this app is not allowed"));
    }

    @Test
    @DisplayName("MANAGED DHL=true (nur DHL): SHOP-API -> DENY")
    void managedDhlOnly_shopApi_deny() throws Exception {
        authenticateAsUser(USER_ID);
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_121, AppKey.SHOP)).thenReturn(false);

        HttpServletRequest request = requestWithPathVariables(Map.of("storeId", "121"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(ShopStoreScopedHandler.class));

        assertFalse(result);
        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    @Test
    @DisplayName("MANAGED DHL=true (nur DHL): DhlAdminController-Muster (SHOP, ORDER_ID_PARAM) -> DENY")
    void managedDhlOnly_dhlAdminOrderScopedShopEndpoint_deny() throws Exception {
        authenticateAsUser(USER_ID);

        Order order = new Order();
        Store store = new Store();
        store.setId(STORE_121);
        order.setStore(store);
        when(orderRepository.findById(55L)).thenReturn(Optional.of(order));
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_121, AppKey.SHOP)).thenReturn(false);

        HttpServletRequest request = requestWithPathVariables(Map.of("orderId", "55"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(OrderScopedHandler.class));

        assertFalse(result);
        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(orderRepository).findById(55L);
    }

    @Test
    @DisplayName("MANAGED DHL=true (nur DHL): LOYALTY-API -> DENY")
    void managedDhlOnly_loyaltyApi_deny() throws Exception {
        authenticateAsUser(USER_ID);
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_121, AppKey.LOYALTY)).thenReturn(false);

        HttpServletRequest request = requestWithPathVariables(Map.of("storeId", "121"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(LoyaltyStoreScopedHandler.class));

        assertFalse(result);
    }

    @Test
    @DisplayName("MANAGED DHL=true (nur DHL): MARITIME (GLOBAL) -> DENY")
    void managedDhlOnly_maritimeApi_deny() throws Exception {
        authenticateAsUser(USER_ID);
        when(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.MARITIME)).thenReturn(false);

        // Scope = NONE -> Request wird für die Scope-Auflösung gar nicht angefasst.
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(MaritimeGlobalHandler.class));

        assertFalse(result);
    }

    @Test
    @DisplayName("MANAGED DHL=true (nur DHL): ISSUE_ANALYSIS (GLOBAL) -> DENY")
    void managedDhlOnly_issueAnalysisApi_deny() throws Exception {
        authenticateAsUser(USER_ID);
        when(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.ISSUE_ANALYSIS)).thenReturn(false);

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(IssueAnalysisGlobalHandler.class));

        assertFalse(result);
    }

    @Test
    @DisplayName("PLATFORM_SHARED/PUBLIC: kein @RequiresApp -> unverändertes bestehendes Verhalten (kein AppAccessChecker-Aufruf)")
    void noAnnotation_platformSharedOrPublic_untouched() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(NoAnnotationHandler.class));

        assertTrue(result);
        verifyNoInteractions(appAccessChecker);
        verify(response, never()).setStatus(anyInt());
    }

    @Test
    @DisplayName("Handler ist keine HandlerMethod (z.B. statische Ressource) -> unverändert durchgelassen")
    void nonHandlerMethodHandler_isPassedThrough() throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        boolean result = interceptor.preHandle(request, response, new Object());

        assertTrue(result);
        verifyNoInteractions(appAccessChecker);
    }

    // ════════════════════════════════════════════════════════════════
    // LEGACY-Verhalten (Delegation an AppAccessChecker unverändert)
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("LEGACY-User: AppAccessChecker liefert true (kein Entitlement vorhanden) -> ALLOW, exakt bisheriges Verhalten")
    void legacyUser_allowedViaExistingAppAccessChecker() throws Exception {
        authenticateAsUser(USER_ID);
        // AppAccessChecker.hasAppAccess() liefert bei LEGACY laut Phase 1 immer true -
        // der Interceptor fügt dem keine zusätzliche Einschränkung hinzu.
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_121, AppKey.SHOP)).thenReturn(true);

        HttpServletRequest request = requestWithPathVariables(Map.of("storeId", "121"));
        HttpServletResponse response = mock(HttpServletResponse.class);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(ShopStoreScopedHandler.class));

        assertTrue(result);
        verify(response, never()).setStatus(anyInt());
    }

    // ════════════════════════════════════════════════════════════════
    // Fail-Closed: Scope nicht auflösbar -> DENY (niemals stillschweigend allow)
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("STORE-App ohne auflösbaren Scope (storeId fehlt im Pfad) -> DENY, AppAccessChecker wird NICHT gefragt")
    void storeApp_unresolvableScope_missingStoreId_deny() throws Exception {
        authenticateAsUser(USER_ID);

        HttpServletRequest request = requestWithPathVariables(Map.of()); // kein storeId
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(DhlStoreScopedHandler.class));

        assertFalse(result);
        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verifyNoInteractions(appAccessChecker);
    }

    @Test
    @DisplayName("STORE-App ohne auflösbaren Scope (keine Pfad-Parameter im Request überhaupt) -> DENY")
    void storeApp_unresolvableScope_noPathVariablesAtAll_deny() throws Exception {
        authenticateAsUser(USER_ID);

        HttpServletRequest request = requestWithoutPathVariables();
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(DhlStoreScopedHandler.class));

        assertFalse(result);
        verifyNoInteractions(appAccessChecker);
    }

    @Test
    @DisplayName("ORDER_ID_PARAM: referenzierte Order existiert nicht -> Scope nicht auflösbar -> DENY")
    void orderScoped_orderNotFound_deny() throws Exception {
        authenticateAsUser(USER_ID);
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        HttpServletRequest request = requestWithPathVariables(Map.of("orderId", "999"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(OrderScopedHandler.class));

        assertFalse(result);
        verifyNoInteractions(appAccessChecker);
    }

    @Test
    @DisplayName("Kein authentifizierter User -> DENY (defensiv, fail-closed)")
    void noAuthenticatedUser_deny() throws Exception {
        // Kein SecurityContextHolder-Setup -> kein Principal; Scope-Auflösung wird
        // erst gar nicht versucht (User-Check kommt zuerst).
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(DhlStoreScopedHandler.class));

        assertFalse(result);
        verifyNoInteractions(appAccessChecker);
    }

    // ════════════════════════════════════════════════════════════════
    // GLOBAL-App-Fälle
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("GLOBAL-App + enabled=true -> ALLOW")
    void globalApp_enabled_allow() throws Exception {
        authenticateAsUser(USER_ID);
        when(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.MARITIME)).thenReturn(true);

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(MaritimeGlobalHandler.class));

        assertTrue(result);
    }

    @Test
    @DisplayName("GLOBAL-App ohne Entitlement im MANAGED-Modus -> DENY")
    void globalApp_managedWithoutEntitlement_deny() throws Exception {
        authenticateAsUser(USER_ID);
        when(appAccessChecker.hasAppAccess(USER_ID, null, AppKey.MARITIME)).thenReturn(false);

        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(MaritimeGlobalHandler.class));

        assertFalse(result);
    }

    @Test
    @DisplayName("Scope/AppKey-Inkonsistenz (z.B. GLOBAL-App mit versehentlich aufgelöster storeId) -> DENY statt Exception nach außen")
    void scopeAppKeyMismatch_deniesInsteadOfPropagatingException() throws Exception {
        authenticateAsUser(USER_ID);
        // AppAccessChecker.validateScope wirft IllegalArgumentException bei Scope-Verletzung
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_121, AppKey.DHL))
                .thenThrow(new IllegalArgumentException("Scope-Verletzung"));

        HttpServletRequest request = requestWithPathVariables(Map.of("storeId", "121"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(DhlStoreScopedHandler.class));

        assertFalse(result);
        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
    }

    // ════════════════════════════════════════════════════════════════
    // Ressourcenbasierte Scope-Auflösung (DHL_PARCEL_ID_PARAM / DHL_SLOT_ID_PARAM)
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("DHL_PARCEL_ID_PARAM: storeId wird über DhlParcel aufgelöst -> ALLOW bei passendem Store")
    void parcelScoped_resolvesStoreFromParcel_allow() throws Exception {
        authenticateAsUser(USER_ID);
        DhlParcel parcel = new DhlParcel();
        Store store = new Store();
        store.setId(STORE_121);
        parcel.setStore(store);
        when(dhlParcelRepository.findById(7L)).thenReturn(Optional.of(parcel));
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_121, AppKey.DHL)).thenReturn(true);

        HttpServletRequest request = requestWithPathVariables(Map.of("parcelId", "7"));
        HttpServletResponse response = mock(HttpServletResponse.class);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(ParcelScopedHandler.class));

        assertTrue(result);
    }

    @Test
    @DisplayName("DHL_PARCEL_ID_PARAM: Parcel gehört zu Store 122, User hat nur Store 121 -> DENY")
    void parcelScoped_wrongStore_deny() throws Exception {
        authenticateAsUser(USER_ID);
        DhlParcel parcel = new DhlParcel();
        Store store = new Store();
        store.setId(STORE_122);
        parcel.setStore(store);
        when(dhlParcelRepository.findById(7L)).thenReturn(Optional.of(parcel));
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_122, AppKey.DHL)).thenReturn(false);

        HttpServletRequest request = requestWithPathVariables(Map.of("parcelId", "7"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(ParcelScopedHandler.class));

        assertFalse(result);
    }

    @Test
    @DisplayName("DHL_SLOT_ID_PARAM: storeId wird über DhlShelfSlot aufgelöst -> ALLOW bei passendem Store")
    void slotScoped_resolvesStoreFromSlot_allow() throws Exception {
        authenticateAsUser(USER_ID);
        DhlShelfSlot slot = new DhlShelfSlot();
        Store store = new Store();
        store.setId(STORE_121);
        slot.setStore(store);
        when(dhlShelfSlotRepository.findById(3L)).thenReturn(Optional.of(slot));
        when(appAccessChecker.hasAppAccess(USER_ID, STORE_121, AppKey.DHL)).thenReturn(true);

        HttpServletRequest request = requestWithPathVariables(Map.of("slotId", "3"));
        HttpServletResponse response = mock(HttpServletResponse.class);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(SlotScopedHandler.class));

        assertTrue(result);
    }

    @Test
    @DisplayName("DHL_SLOT_ID_PARAM: referenzierter Slot existiert nicht -> Scope nicht auflösbar -> DENY")
    void slotScoped_slotNotFound_deny() throws Exception {
        authenticateAsUser(USER_ID);
        when(dhlShelfSlotRepository.findById(3L)).thenReturn(Optional.empty());

        HttpServletRequest request = requestWithPathVariables(Map.of("slotId", "3"));
        HttpServletResponse response = mock(HttpServletResponse.class);
        captureResponseBody(response);

        boolean result = interceptor.preHandle(request, response, handlerMethodOf(SlotScopedHandler.class));

        assertFalse(result);
        verifyNoInteractions(appAccessChecker);
    }
}

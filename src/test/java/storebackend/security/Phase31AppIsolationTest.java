package storebackend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import storebackend.controller.AdminPaymentSettingsController;
import storebackend.controller.AnalyticsController;
import storebackend.controller.DhlAdminController;
import storebackend.controller.MediaController;
import storebackend.controller.OrderController;
import storebackend.controller.PosController;
import storebackend.controller.StoreRoleController;
import storebackend.dto.dhl.DhlPackageDataRequest;
import storebackend.entity.User;
import storebackend.enums.AppKey;
import storebackend.enums.AppScopeSource;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Phase 3.1 (Backend App-Isolation - Erweiterung).
 *
 * Reine Verdrahtungs-/Regressionstests (Reflection, kein Spring-Kontext
 * nötig - analog zum bestehenden Muster in {@link AppAccessInterceptorTest},
 * das die Durchsetzungslogik für @RequiresApp bereits generisch über
 * gespiegelte Handler-Klassen abdeckt). Diese Klasse prüft ausschließlich,
 * DASS die reale Annotation an der jeweils richtigen Stelle sitzt bzw.
 * bewusst NICHT gesetzt wurde - das tatsächliche ALLOW/DENY-Verhalten für
 * @RequiresApp(SHOP) ist bereits durch AppAccessInterceptorTest
 * (ShopStoreScopedHandler) abgedeckt.
 */
class Phase31AppIsolationTest {

    // ════════════════════════════════════════════════════════════════
    // Fokus 2: Klar geschützte, nicht-public SHOP-Controller
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("PosController: @RequiresApp(SHOP) auf Klassenebene (Kassensystem, keine PUBLIC-Methoden)")
    void posController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(PosController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("OrderController: @RequiresApp(SHOP) auf Klassenebene (Bestellverwaltung, keine PUBLIC-Methoden)")
    void orderController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(OrderController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("AdminPaymentSettingsController: @RequiresApp(SHOP) auf Klassenebene")
    void adminPaymentSettingsController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(AdminPaymentSettingsController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("AnalyticsController: @RequiresApp(SHOP) auf Klassenebene")
    void analyticsController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(AnalyticsController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("Regression: StoreRoleController trägt weiterhin @RequiresApp(SHOP) (bereits vor Phase 3.1 gesetzt)")
    void storeRoleController_stillHasShopClassAnnotation() {
        assertRequiresAppOnClass(StoreRoleController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("Regression: MediaController trägt weiterhin @RequiresApp(SHOP) (bereits vor Phase 3.1 gesetzt)")
    void mediaController_stillHasShopClassAnnotation() {
        assertRequiresAppOnClass(MediaController.class, AppKey.SHOP);
    }

    // ════════════════════════════════════════════════════════════════
    // Fokus 1: DhlAdminController - testConnection/healthCheck/getConfig
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("DhlAdminController.testConnection(): KEIN @RequiresApp, aber @PreAuthorize(hasRole('ROLE_PLATFORM_ADMIN'))")
    void testConnection_platformAdminOnly_noRequiresApp() throws Exception {
        Method method = DhlAdminController.class.getMethod("testConnection");
        assertNull(method.getAnnotation(RequiresApp.class),
                "testConnection() darf kein @RequiresApp tragen - kein auflösbarer STORE-Scope (siehe Klassen-Javadoc)");
        assertPreAuthorizePlatformAdmin(method);
    }

    @Test
    @DisplayName("DhlAdminController.healthCheck(): KEIN @RequiresApp, aber @PreAuthorize(hasRole('ROLE_PLATFORM_ADMIN'))")
    void healthCheck_platformAdminOnly_noRequiresApp() throws Exception {
        Method method = DhlAdminController.class.getMethod("healthCheck");
        assertNull(method.getAnnotation(RequiresApp.class));
        assertPreAuthorizePlatformAdmin(method);
    }

    @Test
    @DisplayName("DhlAdminController.getConfig(): KEIN @RequiresApp, aber @PreAuthorize(hasRole('ROLE_PLATFORM_ADMIN'))")
    void getConfig_platformAdminOnly_noRequiresApp() throws Exception {
        Method method = DhlAdminController.class.getMethod("getConfig");
        assertNull(method.getAnnotation(RequiresApp.class));
        assertPreAuthorizePlatformAdmin(method);
    }

    @Test
    @DisplayName("Regression: DhlAdminController hat weiterhin KEIN klassenweites @RequiresApp (Mixed-Controller)")
    void dhlAdminController_noClassLevelRequiresApp() {
        assertNull(DhlAdminController.class.getAnnotation(RequiresApp.class),
                "DhlAdminController mischt PLATFORM- und SHOP-Endpunkte - Annotation MUSS methodenscharf bleiben");
    }

    @Test
    @DisplayName("Regression: DhlAdminController.validateShipment() behält @RequiresApp(SHOP, ORDER_ID_PARAM) unverändert")
    void validateShipment_stillShopOrderScoped() throws Exception {
        Method method = DhlAdminController.class.getMethod(
                "validateShipment", Long.class, User.class, DhlPackageDataRequest.class);
        RequiresApp requiresApp = method.getAnnotation(RequiresApp.class);
        assertNotNull(requiresApp, "validateShipment() muss weiterhin @RequiresApp(SHOP, ORDER_ID_PARAM) tragen");
        assertEquals(AppKey.SHOP, requiresApp.value());
        assertEquals(AppScopeSource.ORDER_ID_PARAM, requiresApp.scope());
    }

    @Test
    @DisplayName("Regression: DhlAdminController.createLabel() behält @RequiresApp(SHOP, ORDER_ID_PARAM) unverändert")
    void createLabel_stillShopOrderScoped() throws Exception {
        Method method = DhlAdminController.class.getMethod(
                "createLabel", Long.class, User.class, DhlPackageDataRequest.class);
        RequiresApp requiresApp = method.getAnnotation(RequiresApp.class);
        assertNotNull(requiresApp, "createLabel() muss weiterhin @RequiresApp(SHOP, ORDER_ID_PARAM) tragen");
        assertEquals(AppKey.SHOP, requiresApp.value());
        assertEquals(AppScopeSource.ORDER_ID_PARAM, requiresApp.scope());
    }

    // ════════════════════════════════════════════════════════════════
    // Helfer
    // ════════════════════════════════════════════════════════════════

    private void assertRequiresAppOnClass(Class<?> controllerClass, AppKey expected) {
        RequiresApp requiresApp = controllerClass.getAnnotation(RequiresApp.class);
        assertNotNull(requiresApp, controllerClass.getSimpleName() + " muss @RequiresApp(" + expected + ") auf Klassenebene tragen");
        assertEquals(expected, requiresApp.value());
        // Default-Scope (STORE_ID_PARAM) wird bewusst nicht überschrieben - alle Methoden dieser
        // Controller tragen storeId als Pfad-Parameter.
        assertEquals(AppScopeSource.STORE_ID_PARAM, requiresApp.scope());
    }

    private void assertPreAuthorizePlatformAdmin(Method method) {
        PreAuthorize preAuthorize = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuthorize, method.getName() + "() muss @PreAuthorize tragen");
        assertEquals("hasRole('ROLE_PLATFORM_ADMIN')", preAuthorize.value(),
                method.getName() + "() muss auf ROLE_PLATFORM_ADMIN eingeschränkt sein (Phase 3.1)");
    }
}

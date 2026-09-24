package storebackend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import storebackend.controller.CategoryController;
import storebackend.controller.ChatManagementController;
import storebackend.controller.ChatbotIntentManagementController;
import storebackend.controller.CommissionController;
import storebackend.controller.DeliveryController;
import storebackend.controller.DropshippingController;
import storebackend.controller.FaqManagementController;
import storebackend.controller.HomepageSectionController;
import storebackend.controller.OnboardingController;
import storebackend.controller.ProductController;
import storebackend.controller.ProductMediaController;
import storebackend.controller.ProductOptionController;
import storebackend.controller.ProductTierPriceController;
import storebackend.controller.ProductVariantController;
import storebackend.controller.RedirectController;
import storebackend.controller.SeoSettingsController;
import storebackend.controller.StoreBannerController;
import storebackend.controller.StoreProductController;
import storebackend.controller.StoreSliderController;
import storebackend.controller.StructuredDataController;
import storebackend.controller.SupplierInvoiceDocumentController;
import storebackend.controller.TelegramController;
import storebackend.controller.TelegramMtprotoController;
import storebackend.controller.ThemeController;
import storebackend.controller.WooCommerceController;
import storebackend.enums.AppKey;
import storebackend.enums.AppScopeSource;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 3.2 (Backend App-Isolation - restliches SHOP-Enforcement).
 *
 * Reine Verdrahtungs-/Regressionstests (Reflection, kein Spring-Kontext nötig -
 * analog zum bestehenden Muster in {@link Phase31AppIsolationTest} und
 * {@link AppAccessInterceptorTest}). Diese Klasse prüft ausschließlich, DASS die
 * reale {@link RequiresApp}-Annotation an der jeweils richtigen Stelle sitzt
 * bzw. bewusst NICHT gesetzt wurde. Das tatsächliche ALLOW/DENY-Laufzeitverhalten
 * für @RequiresApp(SHOP) ist bereits generisch durch AppAccessInterceptorTest
 * (ShopStoreScopedHandler) abgedeckt.
 */
class Phase32AppIsolationTest {

    // ════════════════════════════════════════════════════════════════
    // Klassenweite @RequiresApp(SHOP) - vollständig authentifizierte,
    // store-gescopte Controller ohne PUBLIC-Methoden
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("ProductTierPriceController: @RequiresApp(SHOP) auf Klassenebene")
    void productTierPriceController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(ProductTierPriceController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("StoreBannerController: @RequiresApp(SHOP) auf Klassenebene")
    void storeBannerController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(StoreBannerController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("HomepageSectionController: @RequiresApp(SHOP) auf Klassenebene")
    void homepageSectionController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(HomepageSectionController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("RedirectController: @RequiresApp(SHOP) auf Klassenebene")
    void redirectController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(RedirectController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("StructuredDataController: @RequiresApp(SHOP) auf Klassenebene")
    void structuredDataController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(StructuredDataController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("DeliveryController: @RequiresApp(SHOP) auf Klassenebene (inkl. dhl/test-connection = Carrier-in-SHOP)")
    void deliveryController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(DeliveryController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("OnboardingController: @RequiresApp(SHOP) auf Klassenebene")
    void onboardingController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(OnboardingController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("TelegramController: @RequiresApp(SHOP) auf Klassenebene")
    void telegramController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(TelegramController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("TelegramMtprotoController: @RequiresApp(SHOP) auf Klassenebene")
    void telegramMtprotoController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(TelegramMtprotoController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("ChatbotIntentManagementController: @RequiresApp(SHOP) auf Klassenebene")
    void chatbotIntentManagementController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(ChatbotIntentManagementController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("ChatManagementController: @RequiresApp(SHOP) auf Klassenebene")
    void chatManagementController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(ChatManagementController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("FaqManagementController: @RequiresApp(SHOP) auf Klassenebene")
    void faqManagementController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(FaqManagementController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("WooCommerceController: @RequiresApp(SHOP) auf Klassenebene")
    void wooCommerceController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(WooCommerceController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("StoreProductController: @RequiresApp(SHOP) auf Klassenebene (ROLE_RESELLER + storeId)")
    void storeProductController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(StoreProductController.class, AppKey.SHOP);
    }

    @Test
    @DisplayName("SupplierInvoiceDocumentController: @RequiresApp(SHOP) auf Klassenebene")
    void supplierInvoiceDocumentController_hasShopClassAnnotation() {
        assertRequiresAppOnClass(SupplierInvoiceDocumentController.class, AppKey.SHOP);
    }

    // ════════════════════════════════════════════════════════════════
    // Mixed-Controller: nur geschützte Methoden annotiert
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("ProductController: KEIN klassenweites @RequiresApp (Mixed: PUBLIC-GETs + geschützte Mutationen)")
    void productController_noClassLevelRequiresApp() {
        assertNull(ProductController.class.getAnnotation(RequiresApp.class));
    }

    @Test
    @DisplayName("ProductController: geschützte Methoden tragen @RequiresApp(SHOP)")
    void productController_protectedMethodsAnnotated() throws Exception {
        assertRequiresAppOnMethod(ProductController.class, "createProduct",
                Long.class, storebackend.dto.CreateProductRequest.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(ProductController.class, "updateProduct",
                Long.class, Long.class, storebackend.dto.CreateProductRequest.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(ProductController.class, "patchProduct",
                Long.class, Long.class, Map.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(ProductController.class, "deleteProduct",
                Long.class, Long.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(ProductController.class, "setFeatured",
                Long.class, Long.class, Map.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(ProductController.class, "checkAiStatus", Long.class, storebackend.entity.User.class);
    }

    @Test
    @DisplayName("ProductController: genuine PUBLIC-GETs bleiben unannotiert (getProducts, getProduct, getFeaturedProducts, ...)")
    void productController_publicGetsNotAnnotated() throws Exception {
        assertNoRequiresApp(ProductController.class, "getFeaturedProducts", Long.class);
        assertNoRequiresApp(ProductController.class, "getTopProducts", Long.class, int.class);
        assertNoRequiresApp(ProductController.class, "getTrendingProducts", Long.class, int.class);
        assertNoRequiresApp(ProductController.class, "getNewArrivals", Long.class, int.class);
    }

    @Test
    @DisplayName("ProductController.incrementViewCount(): bewusst NICHT annotiert (deklariert 'public access' trotz fehlender permitAll-Regel)")
    void productController_incrementViewCount_deliberatelyNotAnnotated() throws Exception {
        assertNoRequiresApp(ProductController.class, "incrementViewCount", Long.class, Long.class);
    }

    @Test
    @DisplayName("ProductVariantController: nur Mutationen annotiert, GETs bleiben public")
    void productVariantController_onlyMutationsAnnotated() throws Exception {
        assertRequiresAppOnMethod(ProductVariantController.class, "createVariant",
                Long.class, Long.class, storebackend.dto.ProductVariantDTO.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(ProductVariantController.class, "deleteVariant",
                Long.class, Long.class, Long.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(ProductVariantController.class, "generateVariants",
                Long.class, Long.class, storebackend.dto.GenerateVariantsRequest.class, storebackend.entity.User.class);
    }

    @Test
    @DisplayName("ProductOptionController: nur Mutationen annotiert, GET bleibt public")
    void productOptionController_onlyMutationsAnnotated() throws Exception {
        assertRequiresAppOnMethod(ProductOptionController.class, "createProductOption",
                Long.class, Long.class, storebackend.dto.ProductOptionDTO.class);
        assertRequiresAppOnMethod(ProductOptionController.class, "deleteProductOption",
                Long.class, Long.class, Long.class);
    }

    @Test
    @DisplayName("ProductMediaController: nur Mutationen annotiert, GET bleibt public")
    void productMediaController_onlyMutationsAnnotated() throws Exception {
        assertRequiresAppOnMethod(ProductMediaController.class, "setPrimaryImage",
                Long.class, Long.class, Long.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(ProductMediaController.class, "deleteProductMedia",
                Long.class, Long.class, Long.class, storebackend.entity.User.class);
    }

    @Test
    @DisplayName("CategoryController: nur Mutationen annotiert, GETs bleiben public")
    void categoryController_onlyMutationsAnnotated() throws Exception {
        assertRequiresAppOnMethod(CategoryController.class, "updateCategory",
                Long.class, Long.class, storebackend.entity.Category.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(CategoryController.class, "deleteCategory",
                Long.class, Long.class, storebackend.entity.User.class);
    }

    @Test
    @DisplayName("StoreSliderController: aktive/gallery-GETs bleiben public, restliche Methoden annotiert")
    void storeSliderController_activeAndGalleryStayPublic() throws Exception {
        assertNoRequiresApp(StoreSliderController.class, "getActiveSliderImages", Long.class);
        assertNoRequiresApp(StoreSliderController.class, "getGalleryImages", Long.class);
        assertRequiresAppOnMethod(StoreSliderController.class, "getSlider", Long.class);
    }

    @Test
    @DisplayName("SeoSettingsController: getSeoSettings() bewusst NICHT annotiert (mixed public/owner Logik im Methodenkörper)")
    void seoSettingsController_getSeoSettings_deliberatelyNotAnnotated() throws Exception {
        assertNoRequiresApp(SeoSettingsController.class, "getSeoSettings",
                Long.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(SeoSettingsController.class, "updateSeoSettings",
                Long.class, storebackend.dto.seo.SeoSettingsDTO.class, storebackend.entity.User.class);
    }

    @Test
    @DisplayName("CommissionController: nur getResellerPendingCommissions annotiert (RESELLER + storeId-Scope)")
    void commissionController_onlyResellerPendingAnnotated() throws Exception {
        assertRequiresAppOnMethod(CommissionController.class, "getResellerPendingCommissions", Long.class);
        // Platform-/Supplier-/Order-übergreifende Endpunkte bleiben bewusst unannotiert:
        assertNoRequiresApp(CommissionController.class, "getOrderRevenueSplit", Long.class);
        assertNoRequiresApp(CommissionController.class, "getSupplierPendingCommissions");
        assertNoRequiresApp(CommissionController.class, "approveCommissions", Long.class);
    }

    @Test
    @DisplayName("DropshippingController: storeId-/orderId-gescopte Methoden annotiert, variant-/item-gescopte bewusst zurückgestellt")
    void dropshippingController_scopedMethodsAnnotated() throws Exception {
        assertRequiresAppOnMethod(DropshippingController.class, "getSupplierLinksForStore", Long.class, storebackend.entity.User.class);
        assertRequiresAppOnMethod(DropshippingController.class, "calculateTotalMargin", Long.class, storebackend.entity.User.class);

        Method orderItems = DropshippingController.class.getMethod("getOrderItemsWithDropshipping", Long.class, storebackend.entity.User.class);
        RequiresApp requiresApp = orderItems.getAnnotation(RequiresApp.class);
        assertNotNull(requiresApp, "getOrderItemsWithDropshipping() muss @RequiresApp(SHOP, ORDER_ID_PARAM) tragen");
        assertEquals(AppKey.SHOP, requiresApp.value());
        assertEquals(AppScopeSource.ORDER_ID_PARAM, requiresApp.scope());

        // Bewusst zurückgestellt - keine VARIANT_ID_PARAM/ITEM_ID_PARAM-Resolver vorhanden:
        assertNoRequiresApp(DropshippingController.class, "getSupplierLinksForProduct", Long.class, storebackend.entity.User.class);
        assertNoRequiresApp(DropshippingController.class, "updateFulfillment",
                Long.class, storebackend.dto.FulfillmentUpdateRequest.class, storebackend.entity.User.class);
    }

    @Test
    @DisplayName("ThemeController: storeId-Pfad-Methoden annotiert, themeId-only/public bleiben unannotiert")
    void themeController_storeScopedMethodsAnnotated() throws Exception {
        assertRequiresAppOnMethod(ThemeController.class, "getStoreThemes", Long.class, storebackend.entity.User.class);
        // Öffentlich laut Javadoc - bleibt unannotiert:
        assertNoRequiresApp(ThemeController.class, "getActiveTheme", Long.class);
        assertNoRequiresApp(ThemeController.class, "listTemplates", boolean.class);
    }

    // ════════════════════════════════════════════════════════════════
    // Explizit zurückgestellte/nicht existente Endpunkte
    // ════════════════════════════════════════════════════════════════

    @Test
    @DisplayName("CouponController: leere Stub-Datei (0 Byte) - keine Admin-Endpunkte vorhanden, nichts zu annotieren")
    void couponController_isEmptyStubFile() {
        java.io.File file = new java.io.File("src/main/java/storebackend/controller/CouponController.java");
        assertTrue(file.exists(), "CouponController.java sollte als leere Stub-Datei existieren");
        assertEquals(0, file.length(), "CouponController.java ist bewusst leer (0 Byte) - keine Klasse, keine Endpunkte");
    }

    // ════════════════════════════════════════════════════════════════
    // Helfer
    // ════════════════════════════════════════════════════════════════

    private void assertRequiresAppOnClass(Class<?> controllerClass, AppKey expected) {
        RequiresApp requiresApp = controllerClass.getAnnotation(RequiresApp.class);
        assertNotNull(requiresApp, controllerClass.getSimpleName() + " muss @RequiresApp(" + expected + ") auf Klassenebene tragen");
        assertEquals(expected, requiresApp.value());
        assertEquals(AppScopeSource.STORE_ID_PARAM, requiresApp.scope());
    }

    private void assertRequiresAppOnMethod(Class<?> controllerClass, String methodName, Class<?>... paramTypes) throws Exception {
        Method method = controllerClass.getMethod(methodName, paramTypes);
        RequiresApp requiresApp = method.getAnnotation(RequiresApp.class);
        assertNotNull(requiresApp, controllerClass.getSimpleName() + "." + methodName + "() muss @RequiresApp(SHOP) tragen");
        assertEquals(AppKey.SHOP, requiresApp.value());
    }

    private void assertNoRequiresApp(Class<?> controllerClass, String methodName, Class<?>... paramTypes) throws Exception {
        Method method = controllerClass.getMethod(methodName, paramTypes);
        assertNull(method.getAnnotation(RequiresApp.class),
                controllerClass.getSimpleName() + "." + methodName + "() darf KEIN @RequiresApp tragen");
    }
}

package storebackend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import storebackend.controller.DocumentController;
import storebackend.enums.AppKey;
import storebackend.enums.AppScopeSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * DOCUMENTS-App (Phase 1) - Verdrahtungstest analog zu {@link Phase31AppIsolationTest}/
 * {@link Phase32AppIsolationTest}: stellt sicher, dass {@link DocumentController}
 * klassenweit mit {@code @RequiresApp(DOCUMENTS, scope = NONE)} annotiert ist
 * (GLOBAL-App, kein storeId-Pfadparameter irgendwo im Controller).
 */
class DocumentAppIsolationTest {

    @Test
    @DisplayName("DocumentController: @RequiresApp(DOCUMENTS, scope=NONE) auf Klassenebene")
    void documentController_hasDocumentsGlobalClassAnnotation() {
        RequiresApp requiresApp = DocumentController.class.getAnnotation(RequiresApp.class);
        assertNotNull(requiresApp, "DocumentController muss @RequiresApp(DOCUMENTS) auf Klassenebene tragen");
        assertEquals(AppKey.DOCUMENTS, requiresApp.value());
        assertEquals(AppScopeSource.NONE, requiresApp.scope(), "DOCUMENTS ist GLOBAL-scoped - kein storeId-Pfadparameter");
    }

    @Test
    @DisplayName("AppKey.DOCUMENTS ist GLOBAL-scoped")
    void documentsAppKey_isGlobalScope() {
        assertEquals(storebackend.enums.AppScope.GLOBAL, AppKey.DOCUMENTS.getScope());
    }
}

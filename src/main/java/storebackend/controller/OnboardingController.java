package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Onboarding-Fortschritt für einen Store.
 *
 * Statt einen eigenen DB-Tabelle zu verwenden, wird der Fortschritt
 * direkt aus den vorhandenen Daten abgeleitet (Produkte, Theme, Logo, Delivery).
 * Dadurch ist der Status immer aktuell und selbst-heilend.
 */
@RestController
@RequestMapping("/api/stores/{storeId}/onboarding")
@RequiredArgsConstructor
@Slf4j
public class OnboardingController {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final StoreThemeRepository storeThemeRepository;
    private final DeliveryZoneRepository deliveryZoneRepository;

    /**
     * GET /api/stores/{storeId}/onboarding
     *
     * Gibt den aktuellen Onboarding-Fortschritt zurück.
     * Jeder Schritt wird aus realen Daten abgeleitet – kein separater Zustand nötig.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getOnboardingProgress(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findByIdWithOwner(storeId)
                .orElse(null);

        if (store == null || !store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(buildProgress(store));
    }

    /**
     * POST /api/stores/{storeId}/onboarding/complete/{stepId}
     *
     * Wird vom Frontend aufgerufen, wenn der User einen Schritt abgeschlossen hat.
     * Da wir den Fortschritt aus echten Daten ableiten, geben wir einfach
     * den aktuellen Stand zurück (der Schritt sollte durch die Aktion bereits
     * erfüllt sein).
     */
    @PostMapping("/complete/{stepId}")
    public ResponseEntity<Map<String, Object>> completeStep(
            @PathVariable Long storeId,
            @PathVariable String stepId,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findByIdWithOwner(storeId)
                .orElse(null);

        if (store == null || !store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }

        log.info("📋 Onboarding step '{}' marked complete for store {}", stepId, storeId);
        return ResponseEntity.ok(buildProgress(store));
    }

    /** Leitet Onboarding-Status aus echten Daten ab */
    private Map<String, Object> buildProgress(Store store) {
        Long storeId = store.getId();

        // Schritt 1: Mindestens 1 Produkt vorhanden?
        boolean hasProducts = productRepository.countByStoreId(storeId) > 0;

        // Schritt 2: Theme eingerichtet?
        boolean hasTheme = !storeThemeRepository.findByStoreId(storeId).isEmpty();

        // Schritt 3: Logo/Branding gesetzt?
        boolean hasBranding = store.getLogoUrl() != null && !store.getLogoUrl().isBlank();

        // Schritt 4: Lieferzone konfiguriert?
        boolean hasDelivery = !deliveryZoneRepository.findByStoreIdOrderByNameAsc(storeId).isEmpty();

        List<String> completedSteps = new java.util.ArrayList<>();
        if (hasProducts) completedSteps.add("product");
        if (hasTheme)    completedSteps.add("theme");
        if (hasBranding) completedSteps.add("branding");
        if (hasDelivery) completedSteps.add("delivery");

        int total = 4;
        int baseProgress = 25; // Store erstellt = 25%
        int perStep = 75 / total;
        int percentage = baseProgress + (completedSteps.size() * perStep);

        String currentStep = null;
        if (!hasProducts) currentStep = "product";
        else if (!hasTheme) currentStep = "theme";
        else if (!hasBranding) currentStep = "branding";
        else if (!hasDelivery) currentStep = "delivery";

        Map<String, Object> result = new HashMap<>();
        result.put("storeId", storeId);
        result.put("completedSteps", completedSteps);
        result.put("currentStep", currentStep);
        result.put("completionPercentage", Math.min(percentage, 100));
        result.put("steps", buildStepDetails(storeId, hasProducts, hasTheme, hasBranding, hasDelivery));

        return result;
    }

    private List<Map<String, Object>> buildStepDetails(
            Long storeId, boolean hasProducts, boolean hasTheme,
            boolean hasBranding, boolean hasDelivery) {

        return List.of(
            step("product",  "Erstes Produkt hinzufügen",
                 "Beginne mit dem Verkauf durch Hinzufügen deiner ersten Produkte",
                 "📦", "/stores/" + storeId + "/products/new", hasProducts, 10),
            step("theme",    "Design & Template wählen",
                 "Wähle ein professionelles Layout für deinen Shop",
                 "🎨", "/stores/" + storeId + "/theme", hasTheme, 9),
            step("branding", "Logo & Branding einrichten",
                 "Lade dein Logo hoch und passe Farben & Typografie an",
                 "🖼️", "/stores/" + storeId + "/brand", hasBranding, 8),
            step("delivery", "Lieferung konfigurieren",
                 "Richte Lieferzonen und Versandkosten ein",
                 "🚚", "/stores/" + storeId + "/delivery", hasDelivery, 7)
        );
    }

    private Map<String, Object> step(String id, String title, String desc,
                                      String icon, String route,
                                      boolean completed, int priority) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("title", title);
        m.put("description", desc);
        m.put("icon", icon);
        m.put("route", route);
        m.put("completed", completed);
        m.put("priority", priority);
        return m;
    }
}


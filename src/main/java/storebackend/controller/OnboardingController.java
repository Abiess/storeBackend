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
 * direkt aus den vorhandenen Daten abgeleitet (Produkte, Theme, Logo, Telegram).
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
    private final TelegramStoreConfigRepository telegramStoreConfigRepository;

    /**
     * GET /api/stores/{storeId}/onboarding
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getOnboardingProgress(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findByIdWithOwner(storeId).orElse(null);
        if (store == null || !store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(buildProgress(store));
    }

    /**
     * POST /api/stores/{storeId}/onboarding/complete/{stepId}
     */
    @PostMapping("/complete/{stepId}")
    public ResponseEntity<Map<String, Object>> completeStep(
            @PathVariable Long storeId,
            @PathVariable String stepId,
            @AuthenticationPrincipal User user) {

        Store store = storeRepository.findByIdWithOwner(storeId).orElse(null);
        if (store == null || !store.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.notFound().build();
        }
        log.info("📋 Onboarding step '{}' marked complete for store {}", stepId, storeId);
        return ResponseEntity.ok(buildProgress(store));
    }

    /** Leitet Onboarding-Status aus echten Daten ab */
    private Map<String, Object> buildProgress(Store store) {
        Long storeId = store.getId();

        boolean hasProducts = productRepository.countByStoreId(storeId) > 0;
        boolean hasTheme    = !storeThemeRepository.findByStoreId(storeId).isEmpty();
        boolean hasBranding = store.getLogoUrl() != null && !store.getLogoUrl().isBlank();
        boolean hasTelegram = telegramStoreConfigRepository.existsByStoreId(storeId);

        List<String> completedSteps = new java.util.ArrayList<>();
        if (hasProducts) completedSteps.add("product");
        if (hasTheme)    completedSteps.add("theme");
        if (hasBranding) completedSteps.add("branding");
        if (hasTelegram) completedSteps.add("telegram");

        int total       = 4;
        int baseProgress = 25;
        int perStep     = 75 / total;
        int percentage  = baseProgress + (completedSteps.size() * perStep);

        String currentStep = null;
        if (!hasProducts) currentStep = "product";
        else if (!hasTheme)    currentStep = "theme";
        else if (!hasBranding) currentStep = "branding";
        else if (!hasTelegram) currentStep = "telegram";

        Map<String, Object> result = new HashMap<>();
        result.put("storeId", storeId);
        result.put("completedSteps", completedSteps);
        result.put("currentStep", currentStep);
        result.put("completionPercentage", Math.min(percentage, 100));
        result.put("steps", buildStepDetails(storeId, hasProducts, hasTheme, hasBranding, hasTelegram));
        return result;
    }

    private List<Map<String, Object>> buildStepDetails(
            Long storeId, boolean hasProducts, boolean hasTheme,
            boolean hasBranding, boolean hasTelegram) {

        return List.of(
            step("product",  "onboarding.steps.product.title",
                 "onboarding.steps.product.desc",
                 "Package", "/stores/" + storeId + "/products/new", hasProducts, 10),
            step("theme",    "onboarding.steps.theme.title",
                 "onboarding.steps.theme.desc",
                 "Palette", "/stores/" + storeId + "/theme", hasTheme, 9),
            step("branding", "onboarding.steps.branding.title",
                 "onboarding.steps.branding.desc",
                 "Store", "/stores/" + storeId + "/brand", hasBranding, 8),
            step("telegram", "onboarding.steps.telegram.title",
                 "onboarding.steps.telegram.desc",
                 "Bot", "/stores/" + storeId + "/telegram", hasTelegram, 7)
        );
    }

    private Map<String, Object> step(String id, String titleKey, String descKey,
                                      String icon, String route,
                                      boolean completed, int priority) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", id);
        m.put("titleKey", titleKey);
        m.put("descKey", descKey);
        m.put("icon", icon);
        m.put("route", route);
        m.put("completed", completed);
        m.put("priority", priority);
        return m;
    }
}

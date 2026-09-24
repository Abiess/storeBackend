package storebackend.config;

import lombok.Getter;
import org.springframework.stereotype.Component;
import storebackend.dto.PlanDetails;
import storebackend.enums.Plan;

import java.math.BigDecimal;
import java.util.*;

/**
 * Zentrale Konfiguration aller Subscription-Pläne
 * SINGLE SOURCE OF TRUTH für Plan-Limits, Features und Preise
 */
@Component
@Getter
public class PlanConfig {

    // Plan-Preise
    private final Map<Plan, BigDecimal> monthlyPrices = Map.of(
        Plan.FREE, BigDecimal.ZERO,
        Plan.PRO, new BigDecimal("29.99"),
        Plan.ENTERPRISE, new BigDecimal("99.99")
    );

    private final Map<Plan, BigDecimal> yearlyPrices = Map.of(
        Plan.FREE, BigDecimal.ZERO,
        Plan.PRO, new BigDecimal("299.99"),
        Plan.ENTERPRISE, new BigDecimal("999.99")
    );

    // Plan-Limits
    private final Map<Plan, Map<String, Integer>> planLimits = Map.of(
        Plan.FREE, Map.of(
            "maxStores", 2,
            "maxProducts", 100,
            "maxOrders", 500,
            "maxStorageMb", 500,
            "maxCustomDomains", 0,
            "maxSubdomains", 1,
            "maxAiCallsPerMonth", 20
        ),
        Plan.PRO, Map.of(
            "maxStores", 4,
            "maxProducts", 1000,
            "maxOrders", -1,
            "maxStorageMb", 5000,
            "maxCustomDomains", 2,
            "maxSubdomains", 4,
            "maxAiCallsPerMonth", 500
        ),
        Plan.ENTERPRISE, Map.of(
            "maxStores", -1,
            "maxProducts", -1,
            "maxOrders", -1,
            "maxStorageMb", -1,
            "maxCustomDomains", -1,
            "maxSubdomains", -1,
            "maxAiCallsPerMonth", -1
        )
    );

    // Plan-Features (boolean Features)
    private final Map<Plan, Map<String, Boolean>> planFeatures = Map.of(
        Plan.FREE, Map.of(
            "customDomain", false,
            "analytics", false,
            "priority_support", false,
            "api_access", false,
            "multiLanguage", false,
            "customBranding", false
        ),
        Plan.PRO, Map.of(
            "customDomain", true,
            "analytics", true,
            "priority_support", true,
            "api_access", true,
            "multiLanguage", true,
            "customBranding", false
        ),
        Plan.ENTERPRISE, Map.of(
            "customDomain", true,
            "analytics", true,
            "priority_support", true,
            "api_access", true,
            "multiLanguage", true,
            "customBranding", true
        )
    );

    /**
     * Hole alle Plan-Details für API-Antwort
     */
    public List<PlanDetails> getAllPlanDetails() {
        return Arrays.asList(
            buildPlanDetails(Plan.FREE, "Free", "Perfekt für den Start", false),
            buildPlanDetails(Plan.PRO, "Pro", "Für wachsende Unternehmen", true),
            buildPlanDetails(Plan.ENTERPRISE, "Enterprise", "Für große Unternehmen", false)
        );
    }

    /**
     * Baue PlanDetails-Objekt aus Config
     */
    private PlanDetails buildPlanDetails(Plan plan, String name, String description, boolean popular) {
        Map<String, Object> features = new HashMap<>();
        features.putAll(planLimits.get(plan));
        features.putAll(planFeatures.get(plan));

        return PlanDetails.builder()
            .plan(plan.name())
            .name(name)
            .description(description)
            .monthlyPrice(monthlyPrices.get(plan).doubleValue())
            .yearlyPrice(yearlyPrices.get(plan).doubleValue())
            .popular(popular)
            .features(features)
            .build();
    }

    /**
     * Hole Limits für einen Plan
     */
    public Map<String, Integer> getLimits(Plan plan) {
        return planLimits.get(plan);
    }

    /**
     * Hole ein spezifisches Limit
     */
    public Integer getLimit(Plan plan, String limitName) {
        return planLimits.get(plan).get(limitName);
    }

    /**
     * Hole Features für einen Plan
     */
    public Map<String, Boolean> getFeatures(Plan plan) {
        return planFeatures.get(plan);
    }

    /**
     * Prüfe ob Plan ein Feature hat
     */
    public boolean hasFeature(Plan plan, String featureName) {
        return planFeatures.get(plan).getOrDefault(featureName, false);
    }

    /**
     * Hole Preis für Plan und Billing-Zyklus
     */
    public BigDecimal getPrice(Plan plan, String billingCycle) {
        return "YEARLY".equalsIgnoreCase(billingCycle)
            ? yearlyPrices.get(plan)
            : monthlyPrices.get(plan);
    }

    /**
     * Berechne jährliche Ersparnis
     */
    public BigDecimal getYearlySavings(Plan plan) {
        BigDecimal monthlyPrice = monthlyPrices.get(plan);
        BigDecimal yearlyPrice = yearlyPrices.get(plan);
        BigDecimal monthlyTotal = monthlyPrice.multiply(new BigDecimal("12"));
        return monthlyTotal.subtract(yearlyPrice);
    }
}


package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.config.PlanConfig;
import storebackend.dto.UsageStatsDTO;
import storebackend.entity.User;
import storebackend.enums.DomainType;
import storebackend.enums.Plan;
import storebackend.repository.*;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Map;

/**
 * Aggregiert plan-bezogene Verbrauchsstatistiken für einen User:
 * Stores, Produkte, Speicher, Domains, AI-Calls, Endkunden.
 *
 * Wiederverwendete Bausteine:
 *  - Bestehende Count-Methoden in StoreRepository / ProductRepository / DomainRepository / MediaRepository / OrderRepository
 *  - {@link PlanConfig} als Single-Source-of-Truth für Limits
 *  - Plan-Auflösung über User.plan (Plan-Entity) → fällt auf PlanConfig zurück, wenn nicht gesetzt
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UsageService {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final MediaRepository mediaRepository;
    private final DomainRepository domainRepository;
    private final OrderRepository orderRepository;
    private final PlanConfig planConfig;

    /**
     * Liefert die aktuelle Nutzung des Users.
     * Setzt zudem den AI-Counter zurück, falls ein neuer Monat begonnen hat.
     */
    @Transactional
    public UsageStatsDTO getUsageForUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // AI-Counter ggf. monatlich zurücksetzen (lazy on read)
        rolloverAiCounterIfNeeded(user);

        Plan plan = resolvePlan(user);
        Map<String, Integer> limits = planConfig.getLimits(plan);

        long stores       = storeRepository.countByOwner(user);
        long products     = productRepository.countByOwnerId(userId);
        long storageBytes = mediaRepository.sumSizeBytesByOwnerId(userId);
        long storageMb    = storageBytes / (1024L * 1024L);
        long customDomains= domainRepository.countByOwnerIdAndType(userId, DomainType.CUSTOM);
        long subdomains   = domainRepository.countByOwnerIdAndType(userId, DomainType.SUBDOMAIN);
        long customers    = orderRepository.countDistinctCustomersByOwnerId(userId);
        long aiCalls      = user.getAiCallsThisMonth() != null ? user.getAiCallsThisMonth() : 0;

        return UsageStatsDTO.builder()
            .plan(plan.name())
            .stores(item(stores, limits.get("maxStores")))
            .products(item(products, limits.get("maxProducts")))
            .storageMb(item(storageMb, limits.get("maxStorageMb")))
            .customDomains(item(customDomains, limits.get("maxCustomDomains")))
            .subdomains(item(subdomains, limits.get("maxSubdomains")))
            .aiCallsThisMonth(item(aiCalls, limits.get("maxAiCallsPerMonth")))
            .customers(item(customers, null)) // kein Limit
            .build();
    }

    /**
     * Inkrementiert den AI-Counter eines Users um 1.
     * Wird von AI-Services nach erfolgreicher Generierung aufgerufen.
     * @return aktualisierter Counter
     */
    @Transactional
    public int incrementAiCalls(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return 0;
        rolloverAiCounterIfNeeded(user);
        int updated = (user.getAiCallsThisMonth() != null ? user.getAiCallsThisMonth() : 0) + 1;
        user.setAiCallsThisMonth(updated);
        userRepository.save(user);
        return updated;
    }

    /**
     * Prüft ob ein User noch AI-Calls im aktuellen Monat hat.
     * @return true wenn unbegrenzt oder noch unter Limit
     */
    @Transactional(readOnly = true)
    public boolean hasAiCallsLeft(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return false;
        Plan plan = resolvePlan(user);
        Integer limit = planConfig.getLimits(plan).get("maxAiCallsPerMonth");
        if (limit == null || limit < 0) return true; // unbegrenzt
        int used = user.getAiCallsThisMonth() != null ? user.getAiCallsThisMonth() : 0;
        return used < limit;
    }

    // =====================================================
    // Private Helpers
    // =====================================================

    private void rolloverAiCounterIfNeeded(User user) {
        LocalDateTime periodStart = user.getAiCallsPeriodStart();
        YearMonth currentMonth = YearMonth.now();
        if (periodStart == null || !YearMonth.from(periodStart).equals(currentMonth)) {
            user.setAiCallsThisMonth(0);
            user.setAiCallsPeriodStart(currentMonth.atDay(1).atStartOfDay());
            userRepository.save(user);
        }
    }

    private Plan resolvePlan(User user) {
        if (user.getPlan() != null && user.getPlan().getName() != null) {
            try {
                return Plan.valueOf(user.getPlan().getName().toUpperCase());
            } catch (IllegalArgumentException ignored) { /* fallback unten */ }
        }
        return Plan.FREE;
    }

    private UsageStatsDTO.UsageItem item(long used, Integer limit) {
        Integer percent = null;
        if (limit != null && limit > 0) {
            percent = Math.min(100, (int) Math.round((used * 100.0) / limit));
        }
        return UsageStatsDTO.UsageItem.builder()
            .used(used)
            .limit(limit)
            .percent(percent)
            .build();
    }
}


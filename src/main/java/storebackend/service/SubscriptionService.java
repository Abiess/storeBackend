package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Subscription;
import storebackend.enums.Plan;
import storebackend.enums.PaymentMethod;
import storebackend.enums.SubscriptionStatus;
import storebackend.repository.SubscriptionRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final storebackend.config.PlanConfig planConfig;
    private final storebackend.repository.UserRepository userRepository;
    private final storebackend.repository.PlanRepository planRepository;

    /**
     * Hole aktuelle Subscription eines Benutzers
     * Erstellt automatisch FREE Plan wenn keine Subscription existiert
     */
    @Transactional
    public Optional<Subscription> getCurrentSubscription(Long userId) {
        log.info("Lade aktuelle Subscription für User: {}", userId);

        Optional<Subscription> existing = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);

        // Wenn keine aktive Subscription existiert, erstelle FREE Plan
        if (existing.isEmpty()) {
            log.info("Keine Subscription gefunden für User {}, erstelle FREE Plan", userId);
            Subscription freeSub = createSubscription(userId, Plan.FREE);
            return Optional.of(freeSub);
        }

        return existing;
    }

    /**
     * Hole Subscription-Historie eines Benutzers
     */
    public List<Subscription> getSubscriptionHistory(Long userId) {
        log.info("Lade Subscription-Historie für User: {}", userId);
        return subscriptionRepository.findByUserId(userId);
    }

    /**
     * Erstelle neue Subscription (für neue Benutzer)
     */
    @Transactional
    public Subscription createSubscription(Long userId, Plan plan) {
        log.info("Erstelle neue Subscription für User {} mit Plan {}", userId, plan);

        Subscription subscription = new Subscription();
        subscription.setUserId(userId);
        subscription.setPlan(plan);
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setStartDate(LocalDateTime.now());
        subscription.setAmount(planConfig.getPrice(plan, "MONTHLY"));
        subscription.setBillingCycle("MONTHLY");
        subscription.setAutoRenew(false);

        return subscriptionRepository.save(subscription);
    }

    /**
     * Upgrade Plan
     */
    @Transactional
    public Subscription upgradePlan(Long userId, Plan targetPlan, String billingCycle, PaymentMethod paymentMethod) {
        log.info("Upgrade Plan für User {} zu {} ({})", userId, targetPlan, billingCycle);

        // Finde aktuelle Subscription
        Optional<Subscription> currentSubOpt = getCurrentSubscription(userId);

        // ✅ SICHERHEIT: Verhindere versehentliches Downgrade von bezahltem Plan zu FREE
        if (currentSubOpt.isPresent()) {
            Subscription currentSub = currentSubOpt.get();
            if (currentSub.getStatus() == SubscriptionStatus.ACTIVE) {
                // Prüfe ob es ein Downgrade von bezahltem Plan zu FREE ist
                if ((currentSub.getPlan() == Plan.PRO || currentSub.getPlan() == Plan.ENTERPRISE)
                    && targetPlan == Plan.FREE) {
                    log.warn("⚠️ BLOCKIERT: Versuch FREE Plan über aktive {} Subscription zu setzen für User {}",
                             currentSub.getPlan(), userId);
                    throw new RuntimeException("Cannot downgrade from " + currentSub.getPlan() + " to FREE. Please cancel your current subscription first.");
                }
            }
        }

        Subscription subscription;
        if (currentSubOpt.isPresent()) {
            // Upgrade bestehende Subscription
            subscription = currentSubOpt.get();
            subscription.setPlan(targetPlan);
        } else {
            // Erstelle neue Subscription
            subscription = new Subscription();
            subscription.setUserId(userId);
            subscription.setPlan(targetPlan);
            subscription.setStartDate(LocalDateTime.now());
        }

        // Setze Preis basierend auf Billing-Zyklus
        BigDecimal price = planConfig.getPrice(targetPlan, billingCycle);

        subscription.setAmount(price);
        subscription.setBillingCycle(billingCycle);
        subscription.setPaymentMethod(paymentMethod);
        subscription.setStatus(paymentMethod == PaymentMethod.BANK_TRANSFER
            ? SubscriptionStatus.PENDING
            : SubscriptionStatus.ACTIVE);

        // Setze Renewal-Datum
        LocalDateTime renewalDate = "YEARLY".equals(billingCycle)
            ? LocalDateTime.now().plusYears(1)
            : LocalDateTime.now().plusMonths(1);
        subscription.setRenewalDate(renewalDate);

        Subscription savedSubscription = subscriptionRepository.save(subscription);

        // WICHTIG: Aktualisiere auch User.plan für Legacy-Kompatibilität
        // (StoreService prüft aktuell noch User.plan für Limits)
        updateUserPlanFromSubscription(userId, targetPlan);

        log.info("✅ Plan erfolgreich aktualisiert: User {} → {}", userId, targetPlan);
        return savedSubscription;
    }

    /**
     * Aktualisiere User.plan basierend auf Subscription
     * (Legacy-Support für bestehenden Code der User.plan prüft)
     */
    @Transactional
    protected void updateUserPlanFromSubscription(Long userId, storebackend.enums.Plan subscriptionPlan) {
        // Hole User
        storebackend.entity.User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User nicht gefunden"));

        // Finde oder erstelle entsprechenden Plan in plans-Tabelle
        storebackend.entity.Plan planEntity = planRepository.findByName(subscriptionPlan.name())
            .orElseGet(() -> createPlanEntityFromEnum(subscriptionPlan));

        // Setze Plan beim User
        user.setPlan(planEntity);
        userRepository.save(user);

        log.info("User {} Plan aktualisiert auf: {}", userId, subscriptionPlan);
    }

    /**
     * Erstelle Plan Entity aus Enum (falls nicht vorhanden)
     */
    private storebackend.entity.Plan createPlanEntityFromEnum(storebackend.enums.Plan planEnum) {
        Map<String, Integer> limits = planConfig.getLimits(planEnum);

        storebackend.entity.Plan planEntity = new storebackend.entity.Plan();
        planEntity.setName(planEnum.name());
        planEntity.setMaxStores(limits.get("maxStores"));
        planEntity.setMaxProducts(limits.get("maxProducts"));
        planEntity.setMaxCustomDomains(1); // Default
        planEntity.setMaxSubdomains(1); // Default
        planEntity.setMaxStorageMb(1000); // Default
        planEntity.setMaxImageCount(100); // Default

        return planRepository.save(planEntity);
    }

    /**
     * Kündige Subscription
     */
    @Transactional
    public void cancelSubscription(Long subscriptionId) {
        log.info("Kündige Subscription: {}", subscriptionId);

        Subscription subscription = subscriptionRepository.findById(subscriptionId)
            .orElseThrow(() -> new RuntimeException("Subscription nicht gefunden"));

        subscription.setStatus(SubscriptionStatus.CANCELLED);
        subscription.setAutoRenew(false);
        subscription.setEndDate(LocalDateTime.now());

        subscriptionRepository.save(subscription);
    }

    /**
     * Reaktiviere Subscription
     */
    @Transactional
    public Subscription reactivateSubscription(Long subscriptionId) {
        log.info("Reaktiviere Subscription: {}", subscriptionId);

        Subscription subscription = subscriptionRepository.findById(subscriptionId)
            .orElseThrow(() -> new RuntimeException("Subscription nicht gefunden"));

        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setAutoRenew(true);
        subscription.setEndDate(null);

        // Setze neues Renewal-Datum
        LocalDateTime renewalDate = "YEARLY".equals(subscription.getBillingCycle())
            ? LocalDateTime.now().plusYears(1)
            : LocalDateTime.now().plusMonths(1);
        subscription.setRenewalDate(renewalDate);

        return subscriptionRepository.save(subscription);
    }

    /**
     * Aktualisiere Zahlungsmethode
     */
    @Transactional
    public Subscription updatePaymentMethod(Long subscriptionId, PaymentMethod paymentMethod) {
        log.info("Aktualisiere Zahlungsmethode für Subscription {}: {}", subscriptionId, paymentMethod);

        Subscription subscription = subscriptionRepository.findById(subscriptionId)
            .orElseThrow(() -> new RuntimeException("Subscription nicht gefunden"));

        subscription.setPaymentMethod(paymentMethod);

        return subscriptionRepository.save(subscription);
    }

    /**
     * Bestätige Zahlung (für Bank-Überweisungen)
     */
    @Transactional
    public Subscription confirmPayment(Long subscriptionId) {
        log.info("Bestätige Zahlung für Subscription: {}", subscriptionId);

        Subscription subscription = subscriptionRepository.findById(subscriptionId)
            .orElseThrow(() -> new RuntimeException("Subscription nicht gefunden"));

        subscription.setStatus(SubscriptionStatus.ACTIVE);
        Subscription savedSubscription = subscriptionRepository.save(subscription);

        // WICHTIG: Aktualisiere auch User.plan nach Zahlungsbestätigung
        updateUserPlanFromSubscription(subscription.getUserId(), subscription.getPlan());

        return savedSubscription;
    }

    /**
     * Prüfe ob Upgrade möglich ist
     */
    public boolean canUpgrade(Plan currentPlan, Plan targetPlan) {
        List<Plan> planOrder = Arrays.asList(Plan.FREE, Plan.PRO, Plan.ENTERPRISE);
        int currentIndex = planOrder.indexOf(currentPlan);
        int targetIndex = planOrder.indexOf(targetPlan);
        return targetIndex > currentIndex;
    }

    /**
     * Hole Plan-Limits
     */
    public Map<String, Integer> getPlanLimits(Plan plan) {
        return planConfig.getLimits(plan);
    }

    /**
     * Berechne Preis für einen Plan basierend auf Billing-Zyklus
     */
    public Double calculatePrice(String planStr, String billingCycle) {
        Plan plan = Plan.valueOf(planStr.toUpperCase());
        BigDecimal price = planConfig.getPrice(plan, billingCycle);
        return price != null ? price.doubleValue() : 0.0;
    }

    /**
     * Berechne jährliche Ersparnis für einen Plan
     */
    public Double getYearlySavings(String planStr) {
        Plan plan = Plan.valueOf(planStr.toUpperCase());
        BigDecimal savings = planConfig.getYearlySavings(plan);
        return savings.doubleValue();
    }

    /**
     * Hole Plan-Namen (lokalisiert)
     */
    public String getPlanName(Plan plan) {
        switch (plan) {
            case FREE: return "Free";
            case PRO: return "Pro";
            case ENTERPRISE: return "Enterprise";
            default: return plan.name();
        }
    }

    /**
     * Hole Status-Label (lokalisiert)
     */
    public String getStatusLabel(SubscriptionStatus status) {
        switch (status) {
            case ACTIVE: return "Aktiv";
            case CANCELLED: return "Gekündigt";
            case EXPIRED: return "Abgelaufen";
            case PENDING: return "Ausstehend";
            case TRIAL: return "Testphase";
            default: return status.name();
        }
    }

    /**
     * Prüfe ob Plan ein Feature hat
     */
    public boolean hasFeature(Plan plan, String featureName) {
        return planConfig.hasFeature(plan, featureName);
    }

    /**
     * Berechne Tage bis zur Verlängerung
     */
    public Long getDaysUntilRenewal(LocalDateTime renewalDate) {
        if (renewalDate == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        return java.time.temporal.ChronoUnit.DAYS.between(now, renewalDate);
    }

    /**
     * Prüfe ob Subscription bald abläuft
     */
    public boolean isExpiringSoon(LocalDateTime renewalDate) {
        Long days = getDaysUntilRenewal(renewalDate);
        return days != null && days <= 7 && days > 0;
    }
}


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

    // Plan-Preise
    private static final Map<Plan, BigDecimal> MONTHLY_PRICES = Map.of(
        Plan.FREE, BigDecimal.ZERO,
        Plan.PRO, new BigDecimal("29.99"),
        Plan.ENTERPRISE, new BigDecimal("99.99")
    );

    private static final Map<Plan, BigDecimal> YEARLY_PRICES = Map.of(
        Plan.FREE, BigDecimal.ZERO,
        Plan.PRO, new BigDecimal("299.99"),
        Plan.ENTERPRISE, new BigDecimal("999.99")
    );

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
        subscription.setAmount(MONTHLY_PRICES.get(plan));
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
        BigDecimal price = "YEARLY".equals(billingCycle)
            ? YEARLY_PRICES.get(targetPlan)
            : MONTHLY_PRICES.get(targetPlan);

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

        return subscriptionRepository.save(subscription);
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

        return subscriptionRepository.save(subscription);
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
        Map<String, Integer> limits = new HashMap<>();

        switch (plan) {
            case FREE:
                limits.put("maxStores", 1);
                limits.put("maxProducts", 10);
                limits.put("maxOrders", 50);
                break;
            case PRO:
                limits.put("maxStores", 3);
                limits.put("maxProducts", 1000);
                limits.put("maxOrders", -1); // unbegrenzt
                break;
            case ENTERPRISE:
                limits.put("maxStores", -1);
                limits.put("maxProducts", -1);
                limits.put("maxOrders", -1);
                break;
        }

        return limits;
    }
}


package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.config.PlanConfig;
import storebackend.entity.Plan;
import storebackend.entity.Subscription;
import storebackend.enums.SubscriptionStatus;
import storebackend.event.SubscriptionEvent;
import storebackend.repository.PlanRepository;
import storebackend.repository.SubscriptionRepository;
import storebackend.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Lifecycle-Verarbeitung für Subscriptions:
 * - Auto-Renew (verlängert automatisch wenn autoRenew=true und renewalDate erreicht)
 * - Expiry (markiert nicht-renewing Subs als EXPIRED + Downgrade zu FREE)
 * - Trial-Expiry (TRIAL läuft ab → EXPIRED + Downgrade)
 * - Reminder (Events für 7/3/1-Tage-vor-Ablauf)
 * - Trial-Start (manuell triggerbar, z.B. nach Registrierung)
 *
 * Wird vom SubscriptionScheduler aufgerufen.
 * Publiziert SubscriptionEvent-Subevents an den SubscriptionEventListener.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionLifecycleService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final PlanConfig planConfig;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Verarbeitet alle ACTIVE-Subscriptions deren renewalDate erreicht ist.
     * - autoRenew=true → renewalDate wird verlängert (Renewed-Event)
     * - autoRenew=false → Status EXPIRED + Downgrade zu FREE (Expired-Event)
     */
    @Transactional
    public void processDueRenewalsAndExpiries() {
        LocalDateTime now = LocalDateTime.now();
        List<Subscription> due = subscriptionRepository.findByStatusAndRenewalDateBefore(
            SubscriptionStatus.ACTIVE, now
        );

        log.info("[SubscriptionLifecycle] {} fällige Subscriptions zur Verarbeitung", due.size());

        for (Subscription sub : due) {
            try {
                if (Boolean.TRUE.equals(sub.getAutoRenew())) {
                    renew(sub);
                } else {
                    expire(sub);
                }
            } catch (Exception e) {
                log.error("[SubscriptionLifecycle] Fehler bei Subscription {}: {}",
                          sub.getId(), e.getMessage(), e);
            }
        }
    }

    /**
     * Sendet Renewal-Reminder für Subscriptions die in 7, 3 oder 1 Tag(en) ablaufen.
     * Nur für autoRenew=true (sonst macht Reminder keinen Sinn).
     */
    @Transactional(readOnly = true)
    public void publishRenewalReminders() {
        LocalDateTime now = LocalDateTime.now();
        // Wir senden Reminder für Subs deren renewalDate in (0, 7] Tagen liegt
        List<Subscription> upcoming = subscriptionRepository
            .findByStatusAndAutoRenewAndRenewalDateBetween(
                SubscriptionStatus.ACTIVE, true, now, now.plusDays(8)
            );

        for (Subscription sub : upcoming) {
            long daysLeft = java.time.temporal.ChronoUnit.DAYS.between(now, sub.getRenewalDate());
            // Sende Reminder nur an markanten Tagen: 7, 3, 1
            if (daysLeft == 7 || daysLeft == 3 || daysLeft == 1) {
                eventPublisher.publishEvent(new SubscriptionEvent.ReminderDue(this, sub, daysLeft));
                log.info("[SubscriptionLifecycle] Reminder für Sub {} ({} Tage)", sub.getId(), daysLeft);
            }
        }
    }

    /**
     * Verarbeitet abgelaufene TRIAL-Subscriptions.
     * TRIAL + endDate < now → Status EXPIRED + Downgrade zu FREE.
     */
    @Transactional
    public void processTrialExpiries() {
        LocalDateTime now = LocalDateTime.now();
        List<Subscription> expiredTrials = subscriptionRepository
            .findByStatusAndEndDateBefore(SubscriptionStatus.TRIAL, now);

        log.info("[SubscriptionLifecycle] {} abgelaufene Trial-Subscriptions", expiredTrials.size());

        for (Subscription sub : expiredTrials) {
            try {
                expire(sub);
            } catch (Exception e) {
                log.error("[SubscriptionLifecycle] Fehler bei Trial-Expiry {}: {}",
                          sub.getId(), e.getMessage(), e);
            }
        }
    }

    /**
     * Startet eine Trial-Phase (z.B. nach Registrierung oder manuell vom Admin).
     * @param userId    User-ID
     * @param plan      Plan der Trial-Phase (z.B. PRO)
     * @param trialDays Anzahl Tage (z.B. 14)
     */
    @Transactional
    public Subscription startTrial(Long userId, storebackend.enums.Plan plan, int trialDays) {
        log.info("[SubscriptionLifecycle] Starte {}-Tage-Trial für User {} (Plan {})",
                 trialDays, userId, plan);

        // Falls bereits eine ACTIVE/TRIAL Subscription existiert → kein Trial
        subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
            .ifPresent(s -> { throw new RuntimeException("User has active subscription"); });
        subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.TRIAL)
            .ifPresent(s -> { throw new RuntimeException("User already in trial"); });

        Subscription sub = new Subscription();
        sub.setUserId(userId);
        sub.setPlan(plan);
        sub.setStatus(SubscriptionStatus.TRIAL);
        sub.setStartDate(LocalDateTime.now());
        sub.setEndDate(LocalDateTime.now().plusDays(trialDays));
        sub.setRenewalDate(sub.getEndDate());
        sub.setAmount(planConfig.getPrice(plan, "MONTHLY"));
        sub.setBillingCycle("MONTHLY");
        sub.setAutoRenew(false);
        Subscription saved = subscriptionRepository.save(sub);

        // Setze auch User.plan damit Limits gelten
        applyPlanToUser(userId, plan);

        eventPublisher.publishEvent(new SubscriptionEvent.TrialStarted(this, saved));
        return saved;
    }

    // ==================================================================
    // Private Helpers
    // ==================================================================

    private void renew(Subscription sub) {
        LocalDateTime nextRenewal = "YEARLY".equalsIgnoreCase(sub.getBillingCycle())
            ? sub.getRenewalDate().plusYears(1)
            : sub.getRenewalDate().plusMonths(1);
        sub.setRenewalDate(nextRenewal);
        subscriptionRepository.save(sub);
        eventPublisher.publishEvent(new SubscriptionEvent.Renewed(this, sub));
        log.info("[SubscriptionLifecycle] Sub {} verlängert bis {}", sub.getId(), nextRenewal);
    }

    private void expire(Subscription sub) {
        sub.setStatus(SubscriptionStatus.EXPIRED);
        sub.setEndDate(LocalDateTime.now());
        sub.setAutoRenew(false);
        subscriptionRepository.save(sub);

        // Downgrade zu FREE (User.plan)
        applyPlanToUser(sub.getUserId(), storebackend.enums.Plan.FREE);

        eventPublisher.publishEvent(new SubscriptionEvent.Expired(this, sub));
        log.info("[SubscriptionLifecycle] Sub {} abgelaufen, User {} auf FREE gedowngradet",
                 sub.getId(), sub.getUserId());
    }

    /**
     * Synchronisiert User.plan (Plan-Entity) damit Limits sofort greifen.
     * Logik analog zu SubscriptionService.updateUserPlanFromSubscription().
     */
    private void applyPlanToUser(Long userId, storebackend.enums.Plan planEnum) {
        userRepository.findById(userId).ifPresent(user -> {
            Plan planEntity = planRepository.findByName(planEnum.name())
                .orElseGet(() -> createPlanEntityFromEnum(planEnum));
            user.setPlan(planEntity);
            userRepository.save(user);
        });
    }

    private Plan createPlanEntityFromEnum(storebackend.enums.Plan planEnum) {
        Map<String, Integer> limits = planConfig.getLimits(planEnum);
        Plan p = new Plan();
        p.setName(planEnum.name());
        p.setMaxStores(limits.getOrDefault("maxStores", 1));
        p.setMaxProducts(limits.getOrDefault("maxProducts", 100));
        p.setMaxCustomDomains(1);
        p.setMaxSubdomains(1);
        p.setMaxStorageMb(1000);
        p.setMaxImageCount(100);
        return planRepository.save(p);
    }
}


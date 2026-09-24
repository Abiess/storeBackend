package storebackend.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import storebackend.service.SubscriptionLifecycleService;

/**
 * Cron-Jobs für Subscription-Lifecycle.
 * Aktiviert über @EnableScheduling in {@link storebackend.StoreBackendApplication}.
 *
 * Cron-Format: sec min hour day month weekday
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final SubscriptionLifecycleService lifecycle;

    /** Täglich 02:00 — Auto-Renewal & Expiry für ACTIVE-Subscriptions */
    @Scheduled(cron = "${app.subscription.cron.renewal:0 0 2 * * *}")
    public void runRenewalsAndExpiries() {
        log.info("⏰ [Scheduler] Renewals/Expiries-Job gestartet");
        try {
            lifecycle.processDueRenewalsAndExpiries();
        } catch (Exception e) {
            log.error("[Scheduler] Renewals/Expiries-Job fehlgeschlagen", e);
        }
    }

    /** Täglich 02:30 — Trial-Expiry */
    @Scheduled(cron = "${app.subscription.cron.trial:0 30 2 * * *}")
    public void runTrialExpiries() {
        log.info("⏰ [Scheduler] Trial-Expiry-Job gestartet");
        try {
            lifecycle.processTrialExpiries();
        } catch (Exception e) {
            log.error("[Scheduler] Trial-Expiry-Job fehlgeschlagen", e);
        }
    }

    /** Täglich 09:00 — Reminder-E-Mails (7/3/1 Tage vor Ablauf) */
    @Scheduled(cron = "${app.subscription.cron.reminder:0 0 9 * * *}")
    public void runReminders() {
        log.info("⏰ [Scheduler] Reminder-Job gestartet");
        try {
            lifecycle.publishRenewalReminders();
        } catch (Exception e) {
            log.error("[Scheduler] Reminder-Job fehlgeschlagen", e);
        }
    }
}


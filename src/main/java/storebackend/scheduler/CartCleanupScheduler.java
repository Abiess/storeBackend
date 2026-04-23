package storebackend.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import storebackend.service.CartCleanupService;

/**
 * Cron-Jobs für Warenkorb-Cleanup &amp; Abandoned-Cart-Reminder.
 * Aktiviert über {@code @EnableScheduling} in
 * {@link storebackend.StoreBackendApplication}.
 *
 * Cron-Format: sec min hour day month weekday
 *
 * Defaults (überschreibbar via env / application.yml):
 *  - app.cart.cron.cleanup  = "0 15 3 * * *"  → täglich 03:15 Cleanup
 *  - app.cart.cron.reminder = "0 0 10 * * *"  → täglich 10:00 Reminder
 *  - app.cart.reminder.idle-hours = 24        → Carts inaktiv seit 24h
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CartCleanupScheduler {

    private final CartCleanupService cartCleanup;

    @Value("${app.cart.reminder.idle-hours:24}")
    private int idleHours;

    /** Täglich 03:15 — Lösche abgelaufene Warenkörbe (expiresAt &lt; now). */
    @Scheduled(cron = "${app.cart.cron.cleanup:0 15 3 * * *}")
    public void runCleanup() {
        log.info("⏰ [Scheduler] Cart-Cleanup-Job gestartet");
        try {
            cartCleanup.cleanupExpiredCarts();
        } catch (Exception e) {
            log.error("[Scheduler] Cart-Cleanup-Job fehlgeschlagen", e);
        }
    }

    /** Täglich 10:00 — Sende Erinnerungen für verlassene Warenkörbe. */
    @Scheduled(cron = "${app.cart.cron.reminder:0 0 10 * * *}")
    public void runAbandonedReminders() {
        log.info("⏰ [Scheduler] Abandoned-Cart-Reminder-Job gestartet (idle={}h)", idleHours);
        try {
            cartCleanup.sendAbandonedCartReminders(idleHours);
        } catch (Exception e) {
            log.error("[Scheduler] Abandoned-Cart-Reminder-Job fehlgeschlagen", e);
        }
    }
}


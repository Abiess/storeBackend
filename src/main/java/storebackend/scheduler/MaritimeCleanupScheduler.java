package storebackend.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import storebackend.service.AisStreamClientService;

/**
 * Regelmäßiger Cleanup des Maritime-Vessel-Caches (siehe {@link AisStreamClientService}).
 * Entfernt Schiffe, die länger als 30 Minuten nicht mehr gemeldet wurden – verhindert
 * unbegrenztes Wachstum des In-Memory-Caches (OOM-Schutz).
 *
 * Cron-Format: sec min hour day month weekday
 * Default: alle 5 Minuten (überschreibbar via app.maritime.cron.cleanup).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MaritimeCleanupScheduler {

    private final AisStreamClientService aisStreamClientService;

    @Scheduled(cron = "${app.maritime.cron.cleanup:0 */5 * * * *}")
    public void runCleanup() {
        try {
            aisStreamClientService.cleanupStaleVessels();
        } catch (Exception e) {
            log.error("[Scheduler] Maritime-Vessel-Cleanup-Job fehlgeschlagen", e);
        }
    }
}

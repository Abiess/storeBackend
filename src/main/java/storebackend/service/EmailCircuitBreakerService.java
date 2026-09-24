package storebackend.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * E-Mail Circuit Breaker Service
 * 
 * Schützt vor Mailflut durch globale Limits pro E-Mail-Typ.
 * Wenn Limit überschritten → Circuit öffnet → keine weiteren Mails bis Cooldown.
 * 
 * KRITISCH für Spam-Schutz!
 */
@Service
@Slf4j
public class EmailCircuitBreakerService {

    // Cache für Zähler (per E-Mail-Typ + Zeitfenster)
    private final Cache<String, AtomicInteger> minuteCounters;
    private final Cache<String, AtomicInteger> hourCounters;
    private final Cache<String, AtomicInteger> dayCounters;

    // Circuit Breaker Status (true = OPEN = blockiert)
    private final Cache<String, Boolean> circuitStatus;

    // Limits pro E-Mail-Typ
    private static final int VERIFICATION_EMAIL_LIMIT_PER_MINUTE = 20;
    private static final int VERIFICATION_EMAIL_LIMIT_PER_HOUR = 100;
    private static final int VERIFICATION_EMAIL_LIMIT_PER_DAY = 1000;

    private static final int PASSWORD_RESET_LIMIT_PER_MINUTE = 15;
    private static final int PASSWORD_RESET_LIMIT_PER_HOUR = 80;
    private static final int PASSWORD_RESET_LIMIT_PER_DAY = 500;

    private static final int STORE_ACCESS_LIMIT_PER_MINUTE = 20;
    private static final int STORE_ACCESS_LIMIT_PER_HOUR = 100;
    private static final int STORE_ACCESS_LIMIT_PER_DAY = 500;

    private static final int ORDER_CONFIRMATION_LIMIT_PER_MINUTE = 50;
    private static final int ORDER_CONFIRMATION_LIMIT_PER_HOUR = 500;
    private static final int ORDER_CONFIRMATION_LIMIT_PER_DAY = 5000;

    public EmailCircuitBreakerService() {
        this.minuteCounters = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(1))
            .maximumSize(100)
            .build();

        this.hourCounters = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofHours(1))
            .maximumSize(100)
            .build();

        this.dayCounters = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofDays(1))
            .maximumSize(100)
            .build();

        this.circuitStatus = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(5)) // Circuit schließt nach 5 Minuten
            .maximumSize(50)
            .build();
    }

    /**
     * Prüft ob E-Mail-Versand erlaubt ist (Circuit Breaker Check)
     * 
     * @param emailType Typ der E-Mail (verification, password-reset, store-access, order-confirmation, etc.)
     * @return true wenn erlaubt, false wenn blockiert
     */
    public boolean allowEmail(String emailType) {
        // Circuit bereits offen? (= blockiert)
        if (Boolean.TRUE.equals(circuitStatus.getIfPresent(emailType))) {
            log.warn("🚨 Circuit Breaker OPEN for email type: {} - Mail blocked", emailType);
            return false;
        }

        // Zähler inkrementieren
        AtomicInteger minuteCount = minuteCounters.get(emailType, k -> new AtomicInteger(0));
        AtomicInteger hourCount = hourCounters.get(emailType, k -> new AtomicInteger(0));
        AtomicInteger dayCount = dayCounters.get(emailType, k -> new AtomicInteger(0));

        int currentMinute = minuteCount.incrementAndGet();
        int currentHour = hourCount.incrementAndGet();
        int currentDay = dayCount.incrementAndGet();

        // Limits prüfen
        Limits limits = getLimitsForType(emailType);

        if (currentMinute > limits.perMinute) {
            log.error("🚨 Circuit Breaker TRIPPED: {} emails exceeded {} per minute limit", 
                emailType, limits.perMinute);
            circuitStatus.put(emailType, true);
            return false;
        }

        if (currentHour > limits.perHour) {
            log.error("🚨 Circuit Breaker TRIPPED: {} emails exceeded {} per hour limit", 
                emailType, limits.perHour);
            circuitStatus.put(emailType, true);
            return false;
        }

        if (currentDay > limits.perDay) {
            log.error("🚨 Circuit Breaker TRIPPED: {} emails exceeded {} per day limit", 
                emailType, limits.perDay);
            circuitStatus.put(emailType, true);
            return false;
        }

        // Warnung bei hoher Last
        if (currentMinute > limits.perMinute * 0.8) {
            log.warn("⚠️ High email load: {} - {}/{} per minute", 
                emailType, currentMinute, limits.perMinute);
        }

        return true;
    }

    /**
     * Manuelles Öffnen des Circuit Breakers (für Emergency Stop)
     */
    public void openCircuit(String emailType) {
        circuitStatus.put(emailType, true);
        log.error("🚨 Circuit Breaker MANUALLY OPENED for: {}", emailType);
    }

    /**
     * Manuelles Schließen des Circuit Breakers
     */
    public void closeCircuit(String emailType) {
        circuitStatus.invalidate(emailType);
        log.info("✅ Circuit Breaker MANUALLY CLOSED for: {}", emailType);
    }

    /**
     * Status-Check für Monitoring
     */
    public boolean isCircuitOpen(String emailType) {
        return Boolean.TRUE.equals(circuitStatus.getIfPresent(emailType));
    }

    /**
     * Aktuelle Zähler abrufen (für Monitoring Dashboard)
     */
    public EmailStats getStats(String emailType) {
        AtomicInteger minuteCount = minuteCounters.getIfPresent(emailType);
        AtomicInteger hourCount = hourCounters.getIfPresent(emailType);
        AtomicInteger dayCount = dayCounters.getIfPresent(emailType);

        Limits limits = getLimitsForType(emailType);

        return new EmailStats(
            emailType,
            minuteCount != null ? minuteCount.get() : 0,
            limits.perMinute,
            hourCount != null ? hourCount.get() : 0,
            limits.perHour,
            dayCount != null ? dayCount.get() : 0,
            limits.perDay,
            isCircuitOpen(emailType)
        );
    }

    /**
     * Limits für E-Mail-Typ
     */
    private Limits getLimitsForType(String emailType) {
        return switch (emailType) {
            case "verification" -> new Limits(
                VERIFICATION_EMAIL_LIMIT_PER_MINUTE,
                VERIFICATION_EMAIL_LIMIT_PER_HOUR,
                VERIFICATION_EMAIL_LIMIT_PER_DAY
            );
            case "password-reset" -> new Limits(
                PASSWORD_RESET_LIMIT_PER_MINUTE,
                PASSWORD_RESET_LIMIT_PER_HOUR,
                PASSWORD_RESET_LIMIT_PER_DAY
            );
            case "store-access" -> new Limits(
                STORE_ACCESS_LIMIT_PER_MINUTE,
                STORE_ACCESS_LIMIT_PER_HOUR,
                STORE_ACCESS_LIMIT_PER_DAY
            );
            case "order-confirmation" -> new Limits(
                ORDER_CONFIRMATION_LIMIT_PER_MINUTE,
                ORDER_CONFIRMATION_LIMIT_PER_HOUR,
                ORDER_CONFIRMATION_LIMIT_PER_DAY
            );
            default -> new Limits(10, 50, 200); // Conservative default
        };
    }

    // ── DTOs ──

    private record Limits(int perMinute, int perHour, int perDay) {}

    public record EmailStats(
        String emailType,
        int currentMinute,
        int limitMinute,
        int currentHour,
        int limitHour,
        int currentDay,
        int limitDay,
        boolean circuitOpen
    ) {}
}

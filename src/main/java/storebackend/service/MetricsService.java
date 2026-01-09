package storebackend.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class MetricsService {

    private final MeterRegistry meterRegistry;
    private final Counter apiErrorCounter;
    private final Counter apiSuccessCounter;

    public MetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        // Counter für API-Fehler
        this.apiErrorCounter = Counter.builder("api.errors")
                .description("Total number of API errors")
                .tag("type", "error")
                .register(meterRegistry);

        // Counter für erfolgreiche Requests
        this.apiSuccessCounter = Counter.builder("api.success")
                .description("Total number of successful API calls")
                .tag("type", "success")
                .register(meterRegistry);
    }

    /**
     * Erfasst einen API-Fehler mit Details
     */
    public void recordApiError(String endpoint, String method, int statusCode, String errorType) {
        apiErrorCounter.increment();

        Counter.builder("api.errors.detailed")
                .description("API errors by endpoint")
                .tag("endpoint", endpoint)
                .tag("method", method)
                .tag("status", String.valueOf(statusCode))
                .tag("error_type", errorType)
                .register(meterRegistry)
                .increment();

        log.warn("📊 API Error tracked: {} {} - Status: {}, Type: {}", method, endpoint, statusCode, errorType);
    }

    /**
     * Erfasst erfolgreichen API-Call
     */
    public void recordApiSuccess(String endpoint, String method) {
        apiSuccessCounter.increment();

        Counter.builder("api.success.detailed")
                .description("Successful API calls by endpoint")
                .tag("endpoint", endpoint)
                .tag("method", method)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Erfasst Response-Zeit
     */
    public void recordResponseTime(String endpoint, String method, long durationMs) {
        Timer.builder("api.response.time")
                .description("API response time in milliseconds")
                .tag("endpoint", endpoint)
                .tag("method", method)
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }

    /**
     * Erfasst DB-Query-Fehler
     */
    public void recordDatabaseError(String operation, String table) {
        Counter.builder("database.errors")
                .description("Database operation errors")
                .tag("operation", operation)
                .tag("table", table)
                .register(meterRegistry)
                .increment();

        log.error("📊 Database Error tracked: {} on table {}", operation, table);
    }

    /**
     * Erfasst Authentication-Fehler
     */
    public void recordAuthError(String reason, String endpoint) {
        Counter.builder("auth.errors")
                .description("Authentication failures")
                .tag("reason", reason)
                .tag("endpoint", endpoint)
                .register(meterRegistry)
                .increment();

        log.warn("🔒 Auth Error tracked: {} on {}", reason, endpoint);
    }
}


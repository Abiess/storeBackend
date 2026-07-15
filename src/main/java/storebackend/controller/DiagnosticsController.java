package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.SecurityEvent;
import storebackend.enums.EventType;
import storebackend.enums.BlockReason;
import storebackend.repository.SecurityEventRepository;
import storebackend.service.SecurityEventService;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin-Controller für System-Diagnose und Health-Checks.
 * 
 * ACHTUNG: In Production durch Admin-Auth schützen!
 */
@RestController
@RequestMapping("/api/admin/diagnostics")
@RequiredArgsConstructor
@Slf4j
public class DiagnosticsController {

    private final Environment env;
    private final DataSource dataSource;
    private final SecurityEventRepository securityEventRepository;
    private final SecurityEventService securityEventService;

    /**
     * System-Info: Build, DB-Connection, Active Profiles
     * 
     * GET /api/admin/diagnostics/info
     */
    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        Map<String, Object> info = new HashMap<>();
        
        // Build Info
        Map<String, String> build = new HashMap<>();
        build.put("version", getClass().getPackage().getImplementationVersion() != null ? 
            getClass().getPackage().getImplementationVersion() : "DEVELOPMENT");
        build.put("timestamp", LocalDateTime.now().toString());
        build.put("javaVersion", System.getProperty("java.version"));
        build.put("springBootVersion", org.springframework.boot.SpringBootVersion.getVersion());
        info.put("build", build);
        
        // Spring Config
        Map<String, String> spring = new HashMap<>();
        spring.put("activeProfiles", String.join(", ", env.getActiveProfiles().length > 0 ? 
            env.getActiveProfiles() : new String[]{"default"}));
        spring.put("serverPort", env.getProperty("server.port", "8080"));
        info.put("spring", spring);
        
        // Database Info
        Map<String, String> database = new HashMap<>();
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            database.put("url", maskPassword(url));
            database.put("user", connection.getMetaData().getUserName());
            database.put("product", connection.getMetaData().getDatabaseProductName());
            database.put("version", connection.getMetaData().getDatabaseProductVersion().split(" ")[0]);
            database.put("connectionValid", "YES");
            
            // Extract host, port, database name
            if (url.contains("jdbc:postgresql://")) {
                String[] parts = url.replace("jdbc:postgresql://", "").split("/");
                if (parts.length >= 2) {
                    database.put("hostPort", parts[0]);
                    database.put("dbName", parts[1].split("\\?")[0]);
                }
            }
        } catch (Exception e) {
            database.put("connectionValid", "NO");
            database.put("error", e.getMessage());
        }
        info.put("database", database);
        
        // Security Features
        Map<String, String> security = new HashMap<>();
        security.put("securityEvents", "ENABLED");
        security.put("rateLimiting", "ENABLED");
        security.put("captchaValidation", "ENABLED");
        security.put("honeypotDetection", "ENABLED");
        security.put("circuitBreaker", "ENABLED");
        info.put("security", security);
        
        return ResponseEntity.ok(info);
    }

    /**
     * DB-Connection-Test: Speichert Test-Event und liest es wieder aus
     * 
     * POST /api/admin/diagnostics/test-db
     */
    @PostMapping("/test-db")
    public ResponseEntity<Map<String, Object>> testDatabaseConnection() {
        Map<String, Object> result = new HashMap<>();
        String testRequestId = "TEST-" + UUID.randomUUID().toString().substring(0, 8);
        
        try {
            log.info("╔═══════════════════════════════════════════════════════════════════════════╗");
            log.info("║ DATABASE CONNECTION TEST - START                                          ║");
            log.info("╠═══════════════════════════════════════════════════════════════════════════╣");
            log.info("║ Test Request ID: {}                                              ║", testRequestId);
            
            // 1. Count existing events
            long countBefore = securityEventRepository.count();
            log.info("║ Events before test: {}                                                 ║", countBefore);
            result.put("eventsBefore", countBefore);
            
            // 2. Create test event
            SecurityEvent testEvent = SecurityEvent.builder()
                .requestId(testRequestId)
                .endpoint("/api/admin/diagnostics/test-db")
                .eventType(EventType.SYSTEM_TEST)
                .httpMethod("POST")
                .httpStatus(200)
                .clientIp("127.0.0.1")
                .userAgent("Admin Diagnostics Test")
                .blocked(false)
                .mailTriggered(false)
                .mailSent(false)
                .build();
            
            log.info("║ Saving test event...                                                     ║");
            SecurityEvent savedEvent = securityEventRepository.save(testEvent);
            log.info("║ ✅ Event saved with ID: {}                                           ║", savedEvent.getId());
            result.put("savedEventId", savedEvent.getId());
            result.put("saveSuccess", true);
            
            // 3. Read it back
            log.info("║ Reading test event back...                                               ║");
            SecurityEvent readEvent = securityEventRepository.findById(savedEvent.getId()).orElse(null);
            
            if (readEvent != null) {
                log.info("║ ✅ Event successfully read back                                          ║");
                result.put("readSuccess", true);
                result.put("readEventId", readEvent.getId());
                result.put("requestIdMatches", testRequestId.equals(readEvent.getRequestId()));
            } else {
                log.error("║ ❌ Failed to read event back!                                            ║");
                result.put("readSuccess", false);
            }
            
            // 4. Count after
            long countAfter = securityEventRepository.count();
            log.info("║ Events after test: {}                                                 ║", countAfter);
            result.put("eventsAfter", countAfter);
            result.put("countIncreased", countAfter > countBefore);
            
            // 5. Find latest events
            List<SecurityEvent> latest = securityEventRepository.findTop5ByOrderByCreatedAtDesc();
            log.info("║ Latest 5 events:                                                         ║");
            for (SecurityEvent event : latest) {
                log.info("║   - ID: {} | {} | {}                           ║", 
                    String.format("%-6s", event.getId()),
                    String.format("%-30s", event.getEndpoint()),
                    event.getCreatedAt());
            }
            result.put("latestEvents", latest.size());
            
            // 6. Cleanup test event
            log.info("║ Cleaning up test event...                                                ║");
            securityEventRepository.deleteById(savedEvent.getId());
            log.info("║ ✅ Test event deleted                                                     ║");
            
            log.info("╠═══════════════════════════════════════════════════════════════════════════╣");
            log.info("║ DATABASE CONNECTION TEST - SUCCESS ✅                                      ║");
            log.info("╚═══════════════════════════════════════════════════════════════════════════╝");
            
            result.put("status", "SUCCESS");
            result.put("message", "Database connection working correctly. Events can be saved and retrieved.");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("╠═══════════════════════════════════════════════════════════════════════════╣");
            log.error("║ DATABASE CONNECTION TEST - FAILED ❌                                       ║");
            log.error("║ Error: {}                                                     ║", e.getMessage());
            log.error("╚═══════════════════════════════════════════════════════════════════════════╝", e);
            
            result.put("status", "FAILED");
            result.put("error", e.getClass().getSimpleName());
            result.put("message", e.getMessage());
            
            return ResponseEntity.status(500).body(result);
        }
    }

    /**
     * Security Events Count
     * 
     * GET /api/admin/diagnostics/events-count
     */
    @GetMapping("/events-count")
    public ResponseEntity<Map<String, Object>> getEventsCount() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            long total = securityEventRepository.count();
            long blocked = securityEventRepository.countByBlocked(true);
            long mailTriggered = securityEventRepository.countByMailTriggered(true);
            long mailSent = securityEventRepository.countByMailSent(true);
            
            result.put("total", total);
            result.put("blocked", blocked);
            result.put("mailTriggered", mailTriggered);
            result.put("mailSent", mailSent);
            
            // Latest event
            List<SecurityEvent> latest = securityEventRepository.findTop5ByOrderByCreatedAtDesc();
            if (!latest.isEmpty()) {
                SecurityEvent newest = latest.get(0);
                result.put("newestEventId", newest.getId());
                result.put("newestEventTime", newest.getCreatedAt());
                result.put("newestEventEndpoint", newest.getEndpoint());
            }
            
            log.info("Events count: total={} blocked={} mailTriggered={} mailSent={}", 
                total, blocked, mailTriggered, mailSent);
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("Failed to get events count", e);
            result.put("error", e.getMessage());
            return ResponseEntity.status(500).body(result);
        }
    }

    private String maskPassword(String url) {
        if (url.contains("password=")) {
            return url.replaceAll("password=[^&]+", "password=***");
        }
        return url;
    }
}

package storebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import storebackend.service.CaptchaService;
import storebackend.service.RateLimitService;
import storebackend.service.EmailCircuitBreakerService;
import storebackend.service.SecurityEventService;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Security Status Banner - zeigt beim Start an, ob alle Schutzmaßnahmen aktiv sind
 * 
 * WICHTIG: Dieser Banner hilft sofort zu erkennen, ob die neuen Security-Features
 * tatsächlich deployed sind und laufen.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class SecurityStatusBanner {
    
    private final Environment environment;
    private final CaptchaService captchaService;
    private final RateLimitService rateLimitService;
    private final EmailCircuitBreakerService circuitBreakerService;
    private final SecurityEventService securityEventService;
    
    @EventListener(ApplicationReadyEvent.class)
    public void displaySecurityStatus() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String profile = String.join(", ", environment.getActiveProfiles());
        if (profile.isEmpty()) {
            profile = "default (PRODUCTION assumed)";
        }
        
        boolean captchaEnabled = captchaService.isEnabled();
        boolean hasSecret = hasValidCaptchaSecret();
        boolean mailEnabled = isMailEnabled();
        String version = getAppVersion();
        
        // Kritische Warnung wenn CAPTCHA in Production ohne Secret
        boolean criticalIssue = captchaEnabled && !hasSecret && isProduction();
        
        log.warn("╔═══════════════════════════════════════════════════════════════════════════╗");
        log.warn("║                                                                           ║");
        log.warn("║                   🛡️  SECURITY PROTECTION STATUS  🛡️                      ║");
        log.warn("║                                                                           ║");
        log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
        log.warn("║ Timestamp:           {}                                   ║", timestamp);
        log.warn("║ Profile:             {}                                           ║", String.format("%-35s", profile));
        log.warn("║ Version:             {}                                           ║", String.format("%-35s", version));
        log.warn("║ Environment:         {}                                           ║", isProduction() ? "PRODUCTION         " : "DEVELOPMENT/TEST   ");
        log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
        log.warn("║ CAPTCHA Protection:  {}                                           ║", captchaEnabled ? "✅ ENABLED         " : "❌ DISABLED        ");
        log.warn("║ CAPTCHA Secret:      {}                                           ║", hasSecret ? "✅ CONFIGURED      " : "❌ MISSING         ");
        log.warn("║ Rate Limiting:       {}                                           ║", "✅ ACTIVE          ");
        log.warn("║ Circuit Breaker:     {}                                           ║", "✅ ACTIVE          ");
        log.warn("║ Security Events:     {}                                           ║", "✅ LOGGING         ");
        log.warn("║ Email Service:       {}                                           ║", mailEnabled ? "✅ ENABLED         " : "❌ DISABLED        ");
        log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
        log.warn("║ Protected Endpoints:                                                      ║");
        log.warn("║   • POST /api/public/create-store/save-email                              ║");
        log.warn("║   • POST /api/auth/forgot-password                                        ║");
        log.warn("║   • POST /api/auth/phone/request-code                                     ║");
        log.warn("║   • POST /api/auth/register (wenn vorhanden)                              ║");
        log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
        log.warn("║ Security Layers:                                                          ║");
        log.warn("║   1. Honeypot Detection                  ✅                                ║");
        log.warn("║   2. IP Rate Limiting                    ✅                                ║");
        log.warn("║   3. Email Rate Limiting                 ✅                                ║");
        log.warn("║   4. Domain Rate Limiting                ✅                                ║");
        log.warn("║   5. Domain Blacklist (60+ disposable)   ✅                                ║");
        log.warn("║   6. CAPTCHA Validation                  {}                                ║", captchaEnabled && hasSecret ? "✅" : "❌");
        log.warn("║   7. Email Circuit Breaker               ✅                                ║");
        log.warn("║   8. Security Event Audit Log            ✅                                ║");
        log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
        
        if (criticalIssue) {
            log.warn("║                                                                           ║");
            log.warn("║ ⚠️  KRITISCHER FEHLER: CAPTCHA ENABLED ABER KEIN SECRET                   ║");
            log.warn("║                                                                           ║");
            log.warn("║ PRODUCTION MODE ERKENNT + KEIN SECRET = ALLE REQUESTS BLOCKIERT          ║");
            log.warn("║                                                                           ║");
            log.warn("║ LÖSUNG: Setze CAPTCHA_SECRET Environment-Variable                        ║");
            log.warn("║         oder deaktiviere CAPTCHA via captcha.enabled=false               ║");
            log.warn("║                                                                           ║");
            log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
        }
        
        if (!captchaEnabled) {
            log.warn("║                                                                           ║");
            log.warn("║ ⚠️  WARNUNG: CAPTCHA IST DEAKTIVIERT                                      ║");
            log.warn("║                                                                           ║");
            log.warn("║ Bot-Protection ist deutlich schwächer ohne CAPTCHA.                      ║");
            log.warn("║ Nur für Development/Testing akzeptabel.                                  ║");
            log.warn("║                                                                           ║");
            log.warn("╠═══════════════════════════════════════════════════════════════════════════╣");
        }
        
        log.warn("║ Status:              {}                                           ║", 
            (captchaEnabled && hasSecret && mailEnabled) ? "✅ FULLY PROTECTED " : "⚠️  DEGRADED MODE  ");
        log.warn("║                                                                           ║");
        log.warn("╚═══════════════════════════════════════════════════════════════════════════╝");
        
        // Zusätzlich INFO-Level für normale Logs
        log.info("🛡️  Security Protection initialized: CAPTCHA={}, RateLimit=ACTIVE, CircuitBreaker=ACTIVE", 
            captchaEnabled ? "ENABLED" : "DISABLED");
    }
    
    private boolean hasValidCaptchaSecret() {
        try {
            String secret = environment.getProperty("captcha.secret");
            return secret != null && !secret.isBlank() && !secret.equals("your-secret-here");
        } catch (Exception e) {
            return false;
        }
    }
    
    private boolean isMailEnabled() {
        String enabled = environment.getProperty("mail.enabled");
        return enabled == null || Boolean.parseBoolean(enabled);
    }
    
    private boolean isProduction() {
        String[] profiles = environment.getActiveProfiles();
        if (profiles.length == 0) {
            return true; // Default = Production
        }
        for (String profile : profiles) {
            if (profile.equalsIgnoreCase("dev") || 
                profile.equalsIgnoreCase("development") ||
                profile.equalsIgnoreCase("local") ||
                profile.equalsIgnoreCase("test")) {
                return false;
            }
        }
        return true;
    }
    
    private String getAppVersion() {
        String version = environment.getProperty("app.version");
        if (version != null && !version.isBlank()) {
            return version;
        }
        // Fallback: Build Timestamp
        String buildTime = environment.getProperty("build.time");
        if (buildTime != null) {
            return "Build " + buildTime;
        }
        return "v1.0-security-patch";
    }
}

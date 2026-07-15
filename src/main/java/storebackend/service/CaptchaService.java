package storebackend.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

/**
 * CAPTCHA Validation Service
 * Unterstützt hCaptcha (empfohlen) und Google reCAPTCHA v3
 *
 * Environment Variables:
 * - captcha.enabled=true/false (Default: true in Production, false in Development)
 * - captcha.provider=hcaptcha|recaptcha (Default: hcaptcha)
 * - captcha.secret=YOUR_SECRET_KEY
 * - captcha.min-score=0.5 (nur reCAPTCHA v3, 0.0-1.0, höher = strenger)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CaptchaService {

    private final WebClient.Builder webClientBuilder;

    @Value("${captcha.enabled:true}")
    private boolean captchaEnabled;

    @Value("${captcha.provider:hcaptcha}")
    private String captchaProvider;

    @Value("${captcha.secret:}")
    private String captchaSecret;

    @Value("${captcha.site-key:}")
    private String captchaSiteKey;

    @Value("${captcha.min-score:0.5}")
    private double minScore;

    private static final String HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";
    private static final String RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    /**
     * Validiert CAPTCHA-Token serverseitig
     * SECURITY: Validiert JEDEN Token bei hCaptcha/reCAPTCHA API
     * - Dummy-Tokens werden abgelehnt
     * - Abgelaufene Tokens werden abgelehnt
     * - Wiederverwendete Tokens werden abgelehnt (hCaptcha meldet dies)
     * 
     * FAIL-CLOSED: In Production wird NIEMALS übersprungen!
     * 
     * @param captchaToken CAPTCHA-Token vom Frontend
     * @param ipAddress IP-Adresse des Clients (optional)
     * @return true wenn CAPTCHA gültig, false wenn ungültig
     */
    public boolean validateCaptcha(String captchaToken, String ipAddress) {
        // CRITICAL: Prüfe ob wir in Production sind
        String profile = getActiveProfile();
        boolean isProduction = !("dev".equals(profile) || "local".equals(profile) || "test".equals(profile));
        
        // CAPTCHA ist explizit deaktiviert
        if (!captchaEnabled) {
            if (isProduction) {
                log.error("🚨 SECURITY: CAPTCHA disabled in PRODUCTION - rejecting request!");
                log.error("🚨 Set captcha.enabled=true or use dev/test profile");
                return false; // FAIL-CLOSED in Production
            }
            log.debug("CAPTCHA validation skipped (disabled in dev/test mode)");
            return true;
        }

        // Secret Key nicht konfiguriert
        if (captchaSecret == null || captchaSecret.isBlank()) {
            if (isProduction) {
                log.error("🚨 SECURITY: CAPTCHA enabled but secret missing in PRODUCTION - rejecting request!");
                log.error("🚨 Set CAPTCHA_SECRET environment variable");
                return false; // FAIL-CLOSED in Production
            }
            log.warn("⚠️ CAPTCHA secret not configured - validation skipped in dev/test mode");
            return true;
        }

        // Token fehlt
        if (captchaToken == null || captchaToken.isBlank()) {
            log.warn("CAPTCHA validation failed: token missing");
            return false;
        }

        // SECURITY: Dummy-Token explizit ablehnen
        if ("CAPTCHA_DISABLED_DEV_MODE".equals(captchaToken)) {
            log.error("CAPTCHA validation failed: dummy token not allowed");
            return false;
        }

        try {
            if ("hcaptcha".equalsIgnoreCase(captchaProvider)) {
                return validateHCaptcha(captchaToken, ipAddress);
            } else if ("recaptcha".equalsIgnoreCase(captchaProvider)) {
                return validateReCaptcha(captchaToken, ipAddress);
            } else {
                log.error("Unknown CAPTCHA provider: {}. Supported: hcaptcha, recaptcha", captchaProvider);
                return false;
            }
        } catch (Exception e) {
            log.error("CAPTCHA validation failed with exception", e);
            return false;
        }
    }

    /**
     * Validiert hCaptcha Token
     * SECURITY: 
     * - Verwendet form-urlencoded POST mit MultiValueMap (nicht JSON/LinkedHashMap!)
     * - Sendet Site Key mit zur Validierung
     * - Prüft success==true
     * - Prüft Hostname exakt (markt.ma, NICHT boesermarkt.ma)
     * - Lehnt Timeouts/Fehler ab
     */
    private boolean validateHCaptcha(String token, String ipAddress) {
        // DIAGNOSTIC: Log configuration (KEINE Secrets!)
        log.info("hCaptcha validation starting: secretConfigured={}, siteKeyConfigured={}", 
                 captchaSecret != null && !captchaSecret.isBlank(),
                 captchaSiteKey != null && !captchaSiteKey.isBlank());

        WebClient webClient = webClientBuilder.baseUrl(HCAPTCHA_VERIFY_URL).build();

        // CRITICAL FIX: MultiValueMap für form-urlencoded (nicht LinkedHashMap!)
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("secret", captchaSecret);
        formData.add("response", token);  // WICHTIG: Feld muss "response" heißen, nicht "token"!
        
        if (captchaSiteKey != null && !captchaSiteKey.isBlank()) {
            formData.add("sitekey", captchaSiteKey);
        }
        if (ipAddress != null && !ipAddress.isBlank()) {
            formData.add("remoteip", ipAddress);
        }

        // DIAGNOSTIC: Log Request-Parameter (KEINE Werte!)
        log.info("hCaptcha API call: fields={}", formData.keySet());

        HCaptchaResponse response = webClient.post()
            .contentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(formData))  // CRITICAL: fromFormData, nicht bodyValue!
            .retrieve()
            .bodyToMono(HCaptchaResponse.class)
            .timeout(Duration.ofSeconds(5))
            .onErrorResume(e -> {
                log.error("hCaptcha API call failed: {}", e.getMessage(), e);
                return Mono.empty();
            })
            .block();

        // SECURITY: Timeout oder API-Fehler → Ablehnen
        if (response == null) {
            log.error("CAPTCHA validation failed: no response from hCaptcha API (timeout or network error)");
            return false;
        }

        // DIAGNOSTIC: Log vollständige Response (KEINE Token/Secrets!)
        log.warn("hCaptcha API response: success={}, errors={}, hostname={}, challengeTimestamp={}", 
                 response.isSuccess(),
                 response.getErrorCodes(),
                 response.getHostname(),
                 response.getChallengeTimestamp());

        // SECURITY: success muss true sein
        if (!response.isSuccess()) {
            log.error("CAPTCHA validation FAILED: success=false, error-codes={}", response.getErrorCodes());
            return false;
        }

        // SECURITY: Hostname null → ablehnen (MUSS vor equals-Prüfung kommen!)
        if (response.getHostname() == null) {
            log.error("CAPTCHA validation failed: hostname is null");
            return false;
        }

        // SECURITY: Hostname prüfen (NUR exakt markt.ma, NICHT boesermarkt.ma)
        // Aktuell nur Haupt-Domain erlaubt, keine Subdomains
        // Später für Subdomains: hostname.equals("markt.ma") || hostname.endsWith(".markt.ma")
        if (!"markt.ma".equalsIgnoreCase(response.getHostname())) {
            log.error("CAPTCHA validation failed: invalid hostname={} (expected: markt.ma)", response.getHostname());
            return false;
        }

        // SUCCESS
        log.info("CAPTCHA validation SUCCESS: provider=hcaptcha, hostname={}", response.getHostname());
        return true;
    }

    /**
     * Validiert Google reCAPTCHA v3 Token
     * SECURITY: 
     * - Verwendet form-urlencoded POST mit MultiValueMap (nicht JSON!)
     * - Prüft success==true, hostname, score
     * - Lehnt Timeouts/Fehler ab
     */
    private boolean validateReCaptcha(String token, String ipAddress) {
        WebClient webClient = webClientBuilder.baseUrl(RECAPTCHA_VERIFY_URL).build();

        // CRITICAL FIX: MultiValueMap für form-urlencoded (nicht Map!)
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("secret", captchaSecret);
        formData.add("response", token);
        if (ipAddress != null && !ipAddress.isBlank()) {
            formData.add("remoteip", ipAddress);
        }

        ReCaptchaResponse response = webClient.post()
            .contentType(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED)
            .body(BodyInserters.fromFormData(formData))  // CRITICAL: fromFormData, nicht bodyValue!
            .retrieve()
            .bodyToMono(ReCaptchaResponse.class)
            .timeout(Duration.ofSeconds(5))
            .onErrorResume(e -> {
                log.error("reCAPTCHA API call failed: {}", e.getMessage(), e);
                return Mono.empty();
            })
            .block();

        // SECURITY: Timeout oder API-Fehler → Ablehnen
        if (response == null) {
            log.error("CAPTCHA validation failed: no response from reCAPTCHA API");
            return false;
        }

        // SECURITY: success muss true sein
        if (!response.isSuccess()) {
            log.warn("CAPTCHA validation failed: success=false, errors={}", response.getErrorCodes());
            return false;
        }

        // SECURITY: Hostname null → ablehnen
        if (response.getHostname() == null) {
            log.error("CAPTCHA validation failed: hostname is null");
            return false;
        }

        // SECURITY: Hostname prüfen (NUR exakt markt.ma)
        if (!"markt.ma".equalsIgnoreCase(response.getHostname())) {
            log.error("CAPTCHA validation failed: invalid hostname={} (expected: markt.ma)", response.getHostname());
            return false;
        }

        // reCAPTCHA v3: Score prüfen (0.0 = Bot, 1.0 = Mensch)
        if (response.getScore() != null && response.getScore() < minScore) {
            log.warn("CAPTCHA validation failed: score={} below minimum={}", response.getScore(), minScore);
            return false;
        }

        // KEINE personenbezogenen Daten (IP) in Production-Logs
        log.info("CAPTCHA validation success: provider=recaptcha, score={}", response.getScore());
        return true;
    }

    // ── Response DTOs ──

    @Data
    private static class HCaptchaResponse {
        private boolean success;

        @JsonProperty("challenge_ts")
        private String challengeTimestamp;

        private String hostname;

        @JsonProperty("error-codes")
        private List<String> errorCodes;
    }

    @Data
    private static class ReCaptchaResponse {
        private boolean success;

        @JsonProperty("challenge_ts")
        private String challengeTimestamp;

        private String hostname;

        private Double score; // 0.0 - 1.0 (nur v3)

        private String action; // Aktionsname (nur v3)

        @JsonProperty("error-codes")
        private List<String> errorCodes;
    }

    /**
     * Ermittelt das aktive Spring-Profil
     */
    private String getActiveProfile() {
        String profilesEnv = System.getenv("SPRING_PROFILES_ACTIVE");
        if (profilesEnv != null && !profilesEnv.isBlank()) {
            return profilesEnv.split(",")[0].trim();
        }
        
        String profilesProp = System.getProperty("spring.profiles.active");
        if (profilesProp != null && !profilesProp.isBlank()) {
            return profilesProp.split(",")[0].trim();
        }
        
        // Default: production
        return "production";
    }
}

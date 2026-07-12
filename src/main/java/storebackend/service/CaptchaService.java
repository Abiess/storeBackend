package storebackend.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

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

    @Value("${captcha.min-score:0.5}")
    private double minScore;

    private static final String HCAPTCHA_VERIFY_URL = "https://hcaptcha.com/siteverify";
    private static final String RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    /**
     * Validiert CAPTCHA-Token serverseitig
     * @param captchaToken CAPTCHA-Token vom Frontend
     * @param ipAddress IP-Adresse des Clients (optional)
     * @return true wenn CAPTCHA gültig, false wenn ungültig
     */
    public boolean validateCaptcha(String captchaToken, String ipAddress) {
        // CAPTCHA ist deaktiviert (Development-Modus)
        if (!captchaEnabled) {
            log.debug("CAPTCHA validation skipped (disabled in config)");
            return true;
        }

        // Secret Key nicht konfiguriert → CAPTCHA überspringen (keine Validierung möglich)
        if (captchaSecret == null || captchaSecret.isBlank()) {
            log.warn("⚠️ CAPTCHA secret not configured - CAPTCHA validation skipped!");
            log.warn("⚠️ For production: Set CAPTCHA_SECRET in environment variables");
            return true; // ✅ CHANGED: return true statt false
        }

        // Token fehlt
        if (captchaToken == null || captchaToken.isBlank()) {
            log.warn("CAPTCHA token is missing");
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
     */
    private boolean validateHCaptcha(String token, String ipAddress) {
        WebClient webClient = webClientBuilder.baseUrl(HCAPTCHA_VERIFY_URL).build();

        Map<String, String> body = Map.of(
            "secret", captchaSecret,
            "response", token,
            "remoteip", ipAddress != null ? ipAddress : ""
        );

        HCaptchaResponse response = webClient.post()
            .bodyValue(body)
            .retrieve()
            .bodyToMono(HCaptchaResponse.class)
            .timeout(Duration.ofSeconds(5))
            .onErrorResume(e -> {
                log.error("hCaptcha API call failed", e);
                return Mono.empty();
            })
            .block();

        if (response == null) {
            log.error("hCaptcha validation failed: No response from API");
            return false;
        }

        if (!response.isSuccess()) {
            log.warn("hCaptcha validation failed: {}", response.getErrorCodes());
            return false;
        }

        log.info("hCaptcha validation successful for IP: {}", ipAddress);
        return true;
    }

    /**
     * Validiert Google reCAPTCHA v3 Token
     */
    private boolean validateReCaptcha(String token, String ipAddress) {
        WebClient webClient = webClientBuilder.baseUrl(RECAPTCHA_VERIFY_URL).build();

        Map<String, String> body = Map.of(
            "secret", captchaSecret,
            "response", token,
            "remoteip", ipAddress != null ? ipAddress : ""
        );

        ReCaptchaResponse response = webClient.post()
            .bodyValue(body)
            .retrieve()
            .bodyToMono(ReCaptchaResponse.class)
            .timeout(Duration.ofSeconds(5))
            .onErrorResume(e -> {
                log.error("reCAPTCHA API call failed", e);
                return Mono.empty();
            })
            .block();

        if (response == null) {
            log.error("reCAPTCHA validation failed: No response from API");
            return false;
        }

        if (!response.isSuccess()) {
            log.warn("reCAPTCHA validation failed: {}", response.getErrorCodes());
            return false;
        }

        // reCAPTCHA v3: Score prüfen (0.0 = Bot, 1.0 = Mensch)
        if (response.getScore() < minScore) {
            log.warn("reCAPTCHA score too low: {} (min: {})", response.getScore(), minScore);
            return false;
        }

        log.info("reCAPTCHA validation successful for IP: {} (score: {})", ipAddress, response.getScore());
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
}

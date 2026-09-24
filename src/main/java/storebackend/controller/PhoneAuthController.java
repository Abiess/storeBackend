package storebackend.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.AuthResponse;
import storebackend.entity.Plan;
import storebackend.entity.User;
import storebackend.enums.Role;
import storebackend.repository.PlanRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.service.PhoneVerificationService;
import storebackend.service.RateLimitService;
import storebackend.service.CaptchaService;
import storebackend.service.SecurityEventService;
import storebackend.util.IpAddressUtil;
import storebackend.enums.BlockReason;
import storebackend.enums.RateLimitType;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Phone-based Authentication Controller
 *
 * Ermöglicht Registrierung und Login via WhatsApp/Telegram ohne E-Mail.
 * Zielgruppe: Marokkanische Nutzer, die schnell starten möchten.
 *
 * Flow:
 *   1. POST /api/auth/phone/request-code  → sendet Code via WhatsApp
 *   2. POST /api/auth/phone/verify-and-login → verifiziert Code, erstellt/findet User, gibt JWT zurück
 */
@RestController
@RequestMapping("/api/auth/phone")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PhoneAuthController {

    private final PhoneVerificationService phoneVerificationService;
    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final RateLimitService rateLimitService;
    private final CaptchaService captchaService;
    private final SecurityEventService securityEventService;

    // ─── DTOs ──────────────────────────────────────────────────────────────────

    public record PhoneCodeRequest(
        @NotBlank(message = "Telefonnummer darf nicht leer sein")
        @Pattern(regexp = "\\+[0-9]{7,15}", message = "Bitte E.164 Format verwenden (z.B. +49151234567890, +212600123456, +33612345678)")
        String phoneNumber,

        /** "whatsapp" oder "telegram" – Standard: whatsapp */
        String channel,
        
        /** hCaptcha token for bot protection */
        String captchaToken
    ) {}

    public record PhoneVerifyRequest(
        @NotNull(message = "verificationId darf nicht leer sein")
        Long verificationId,

        @NotBlank(message = "Code darf nicht leer sein")
        String code
    ) {}

    public record ErrorResponse(String message) {}

    // ─── Endpoints ─────────────────────────────────────────────────────────────

    /**
     * Schritt 1: Verifizierungscode senden
     * POST /api/auth/phone/request-code
     * 
     * ✅ SECURITY: Rate Limiting (IP + Phone) + CAPTCHA + Security Event Logging
     */
    @PostMapping("/request-code")
    public ResponseEntity<?> requestCode(@Valid @RequestBody PhoneCodeRequest request, 
                                        HttpServletRequest httpRequest) {
        String phoneNumber = request.phoneNumber();
        String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);
        String forwardedFor = httpRequest.getHeader("X-Forwarded-For");
        String userAgent = httpRequest.getHeader("User-Agent");
        
        log.info("📱 [PhoneAuth] Code angefordert für: {} von IP: {}", phoneNumber, ipAddress);

        // Security Event Builder
        SecurityEventService.SecurityEventBuilder eventBuilder = securityEventService.builder("/api/auth/phone/request-code")
            .requestId(null)
            .phone(phoneNumber);

        try {
            // Set IP, User-Agent from request
            eventBuilder.request(httpRequest);
            
            // 1. IP Rate Limiting Check (5 requests / 15 minutes)
            if (!rateLimitService.checkIpRateLimit(ipAddress)) {
                log.warn("⚠️ [PhoneAuth] Rate limit exceeded for IP: {}", ipAddress);
                eventBuilder.rateLimit(RateLimitType.IP)
                    .blocked(true, BlockReason.IP_RATE_LIMIT)
                    .httpStatus(429);
                securityEventService.logEvent(eventBuilder);
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Zu viele Versuche. Bitte warten Sie einige Minuten."));
            }

            // 2. Phone Number Rate Limiting Check (3 requests / hour)
            if (!rateLimitService.checkPhoneRateLimit(phoneNumber)) {
                log.warn("⚠️ [PhoneAuth] Rate limit exceeded for phone: {}", maskPhone(phoneNumber));
                eventBuilder.rateLimit(RateLimitType.PHONE)
                    .blocked(true, BlockReason.PHONE_RATE_LIMIT)
                    .httpStatus(429);
                securityEventService.logEvent(eventBuilder);
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Zu viele Versuche für diese Nummer. Bitte später erneut versuchen."));
            }

            // 3. CAPTCHA Validation (serverseitig)
            boolean captchaPresent = request.captchaToken() != null && !request.captchaToken().isBlank();
            boolean captchaValid = false;
            if (captchaPresent) {
                captchaValid = captchaService.validateCaptcha(request.captchaToken(), ipAddress);
            }
            
            eventBuilder.captcha(captchaPresent, captchaValid);

            if (!captchaValid) {
                log.warn("⚠️ [PhoneAuth] CAPTCHA validation failed for IP: {}", ipAddress);
                eventBuilder.blocked(true, BlockReason.CAPTCHA_INVALID)
                    .httpStatus(400);
                securityEventService.logEvent(eventBuilder);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("Sicherheitsprüfung fehlgeschlagen. Bitte erneut versuchen."));
            }

            // 4. Send verification code
            String requestedChannel = request.channel() != null ? request.channel() : "whatsapp";
            PhoneVerificationService.PhoneVerificationResult result =
                phoneVerificationService.sendVerificationCode(phoneNumber, 0L, requestedChannel);

            if (result.isSuccess()) {
                log.info("✅ [PhoneAuth] Code gesendet via {} für: {}", result.getChannel(), maskPhone(phoneNumber));
                eventBuilder.blocked(false, null)
                    .mailSent(false) // SMS/WhatsApp, not email
                    .httpStatus(200);
                securityEventService.logEvent(eventBuilder);
                
                return ResponseEntity.ok(new CodeSentResponse(
                    true,
                    result.getVerificationId(),
                    result.getChannel(),
                    result.getMessage(),
                    10,
                    result.getDevCode(),
                    result.getTelegramLink(),
                    result.getBotUsername()
                ));
            } else {
                log.warn("❌ [PhoneAuth] Code-Versand fehlgeschlagen: {}", result.getMessage());
                eventBuilder.blocked(true, BlockReason.UNKNOWN)
                    .httpStatus(400);
                securityEventService.logEvent(eventBuilder);
                
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse(result.getMessage()));
            }
        } catch (Exception e) {
            log.error("❌ [PhoneAuth] Fehler: {} – {}", e.getClass().getSimpleName(), e.getMessage(), e);
            eventBuilder.blocked(true, BlockReason.UNKNOWN)
                .httpStatus(500);
            securityEventService.logEvent(eventBuilder);
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Fehler beim Senden des Codes. Bitte erneut versuchen."));
        }
    }
    
    /**
     * Mask phone number for logging (DSGVO-compliant)
     * +212600123456 → +212***3456
     */
    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 8) return "***";
        return phone.substring(0, 4) + "***" + phone.substring(phone.length() - 4);
    }

    /**
     * Schritt 2: Code verifizieren + JWT zurückgeben (User wird ggf. angelegt)
     * POST /api/auth/phone/verify-and-login
     */
    @PostMapping("/verify-and-login")
    public ResponseEntity<?> verifyAndLogin(@Valid @RequestBody PhoneVerifyRequest request) {
        log.info("🔐 [PhoneAuth] Verifizierung für ID: {}", request.verificationId());

        try {
            // Code prüfen
            PhoneVerificationService.PhoneVerificationResult result =
                phoneVerificationService.verifyCode(request.verificationId(), request.code());

            if (!result.isSuccess()) {
                log.warn("❌ [PhoneAuth] Falscher Code: {}", result.getMessage());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse(result.getMessage()));
            }

            // Telefonnummer aus der Verification ermitteln
            String phoneNumber = phoneVerificationService.getPhoneNumberByVerificationId(request.verificationId());
            if (phoneNumber == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Verifizierungsdaten nicht gefunden."));
            }

            // User suchen oder neu anlegen
            User user = userRepository.findByPhoneNumber(phoneNumber)
                .orElseGet(() -> createPhoneUser(phoneNumber));

            // JWT generieren
            String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());

            String primaryRole = user.getRoles().isEmpty() ? "USER" : user.getRoles().iterator().next().name();
            AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                primaryRole,
                user.getRoles().stream().map(Enum::name).toList()
            );

            log.info("✅ [PhoneAuth] Login erfolgreich für User ID: {}", user.getId());
            return ResponseEntity.ok(new AuthResponse(token, userDTO));

        } catch (Exception e) {
            log.error("❌ [PhoneAuth] Fehler bei Verifizierung", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Fehler bei der Verifizierung. Bitte versuchen Sie es erneut."));
        }
    }

    // ─── Helper ────────────────────────────────────────────────────────────────

    private User createPhoneUser(String phoneNumber) {
        log.info("👤 [PhoneAuth] Neuen Phone-User anlegen für: {}", phoneNumber);

        // Sichere E-Mail aus Telefonnummer ableiten
        String sanitized = phoneNumber.replaceAll("[^0-9]", "");
        String derivedEmail = "phone-" + sanitized + "@markt.ma";

        // Falls E-Mail aus irgendeinem Grund schon existiert, UUID anhängen
        if (userRepository.existsByEmail(derivedEmail)) {
            derivedEmail = "phone-" + sanitized + "-" + UUID.randomUUID().toString().substring(0, 6) + "@markt.ma";
        }

        User user = new User();
        user.setEmail(derivedEmail);
        user.setPhoneNumber(phoneNumber);
        user.setName("Nutzer " + sanitized.substring(Math.max(0, sanitized.length() - 4)));
        // Passwort ist ein zufälliger Hash – Phone-User können sich nicht per Passwort einloggen
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setEmailVerified(true); // Phone-Auth gilt als verifiziert

        // Sprache anhand des internationalen Ländercodes erkennen
        user.setPreferredLanguage(detectLanguageFromPhone(phoneNumber));

        Set<Role> roles = new HashSet<>();
        roles.add(Role.USER);
        user.setRoles(roles);

        // FREE Plan zuweisen
        Plan freePlan = planRepository.findByName("FREE")
            .orElseThrow(() -> new RuntimeException("FREE plan not found"));
        user.setPlan(freePlan);

        return userRepository.save(user);
    }

    /**
     * Leitet die bevorzugte Sprache aus dem internationalen Ländercode der Telefonnummer ab.
     * Fallback: "en"
     */
    private String detectLanguageFromPhone(String phoneNumber) {
        if (phoneNumber == null) return "en";
        // Marokko, Algerien, Tunesien, Ägypten, Saudi-Arabien, etc.
        if (phoneNumber.startsWith("+212") || phoneNumber.startsWith("+213")
                || phoneNumber.startsWith("+216") || phoneNumber.startsWith("+20")
                || phoneNumber.startsWith("+966") || phoneNumber.startsWith("+971")
                || phoneNumber.startsWith("+974") || phoneNumber.startsWith("+965")
                || phoneNumber.startsWith("+962") || phoneNumber.startsWith("+961")
                || phoneNumber.startsWith("+963") || phoneNumber.startsWith("+964")
                || phoneNumber.startsWith("+967") || phoneNumber.startsWith("+218")) {
            return "ar";
        }
        // Deutschsprachige Länder: Deutschland, Österreich, Schweiz
        if (phoneNumber.startsWith("+49") || phoneNumber.startsWith("+43")
                || phoneNumber.startsWith("+41")) {
            return "de";
        }
        // Französischsprachige Länder (Frankreich, Belgien, ...)
        if (phoneNumber.startsWith("+33") || phoneNumber.startsWith("+32")) {
            return "fr";
        }
        // Standard: Englisch
        return "en";
    }

    // ─── Response Records ──────────────────────────────────────────────────────

    public record CodeSentResponse(
        boolean success,
        Long verificationId,
        String channel,
        String message,
        int expiresInMinutes,
        String devCode,        // DEV-Modus: Code direkt im Browser anzeigen
        String telegramLink,   // Telegram: Deep-Link zum Bot
        String botUsername     // Telegram: Bot-Username für Anzeige
    ) {}
}


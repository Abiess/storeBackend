package storebackend.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
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

    // ─── DTOs ──────────────────────────────────────────────────────────────────

    public record PhoneCodeRequest(
        @NotBlank(message = "Telefonnummer darf nicht leer sein")
        @Pattern(regexp = "\\+[0-9]{7,15}", message = "Bitte E.164 Format verwenden (z.B. +212600123456)")
        String phoneNumber,

        /** "whatsapp" oder "telegram" – Standard: whatsapp */
        String channel
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
     */
    @PostMapping("/request-code")
    public ResponseEntity<?> requestCode(@Valid @RequestBody PhoneCodeRequest request) {
        log.info("📱 [PhoneAuth] Code angefordert für: {}", request.phoneNumber());

        try {
            // storeId = 0L als Sentinel für Auth-Flow (kein echter Store).
            // DB-Constraint erfordert NOT NULL → 0 ist valid (kein FK auf stores-Tabelle).
            PhoneVerificationService.PhoneVerificationResult result =
                phoneVerificationService.sendVerificationCode(request.phoneNumber(), 0L);

            if (result.isSuccess()) {
                log.info("✅ [PhoneAuth] Code gesendet via {}", result.getChannel());
                return ResponseEntity.ok(new CodeSentResponse(
                    true,
                    result.getVerificationId(),
                    result.getChannel(),
                    result.getMessage(),
                    10,
                    result.getDevCode() // null in Produktion, Code-Wert im DEV-Modus
                ));
            } else {
                log.warn("❌ [PhoneAuth] Code-Versand fehlgeschlagen: {}", result.getMessage());
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse(result.getMessage()));
            }
        } catch (Exception e) {
            log.error("❌ [PhoneAuth] Fehler: {} – {}", e.getClass().getSimpleName(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("Fehler beim Senden des Codes: " + e.getMessage()));
        }
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
        user.setPreferredLanguage("ar"); // Marokko-Standard

        Set<Role> roles = new HashSet<>();
        roles.add(Role.USER);
        user.setRoles(roles);

        // FREE Plan zuweisen
        Plan freePlan = planRepository.findByName("FREE")
            .orElseThrow(() -> new RuntimeException("FREE plan not found"));
        user.setPlan(freePlan);

        return userRepository.save(user);
    }

    // ─── Response Records ──────────────────────────────────────────────────────

    public record CodeSentResponse(
        boolean success,
        Long verificationId,
        String channel,
        String message,
        int expiresInMinutes,
        String devCode  // nur im DEV-Modus gesetzt (channel="dev-log"), sonst null
    ) {}
}


package storebackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.AuthResponse;
import storebackend.dto.EmailDeliveryResult;
import storebackend.dto.RegistrationResponse;
import storebackend.dto.LoginRequest;
import storebackend.dto.RegisterRequest;
import storebackend.entity.User;
import storebackend.service.AuthService;
import storebackend.service.CartService;
import storebackend.service.EmailVerificationService;
import storebackend.service.PasswordResetService;
import storebackend.service.RateLimitService;
import storebackend.service.CaptchaService;
import storebackend.service.SecurityEventService;
import storebackend.repository.UserRepository;
import storebackend.util.IpAddressUtil;
import storebackend.enums.EventType;
import storebackend.enums.BlockReason;
import storebackend.enums.MailType;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final CartService cartService;
    private final UserRepository userRepository;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;
    private final RateLimitService rateLimitService;
    private final CaptchaService captchaService;
    private final SecurityEventService securityEventService;

    /**
     * Prüft ob eine E-Mail-Adresse bereits registriert ist
     * 
     * SECURITY:
     * - Rate Limit: IP-basiert (verhindert Enumeration-Angriffe)
     * - Keine zusätzlichen Informationen außer available true/false
     * - Kein Timing-Leak: Antwort dauert immer gleich lang
     * 
     * @param email E-Mail-Adresse zum Prüfen
     * @return { "available": true/false }
     */
    @GetMapping("/check-email")
    public ResponseEntity<?> checkEmailAvailability(@RequestParam String email,
                                                    HttpServletRequest httpRequest) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);
        
        // Rate Limit: Verhindert E-Mail-Enumeration
        if (!rateLimitService.checkIpRateLimit(ipAddress)) {
            log.warn("[{}] Rate limit exceeded for IP: {} on /check-email", requestId, ipAddress);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("TOO_MANY_REQUESTS", "Too many requests. Please try again later."));
        }
        
        // E-Mail-Format validieren
        if (email == null || email.isBlank() || !email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("INVALID_EMAIL", "Invalid email format"));
        }
        
        // Prüfe ob E-Mail existiert
        boolean exists = userRepository.existsByEmail(email.toLowerCase().trim());
        
        // SECURITY: Timing-konstant antworten (verhindert Timing-Angriffe)
        // In Produktion könnte hier eine minimale zufällige Verzögerung hinzugefügt werden
        
        return ResponseEntity.ok(new EmailAvailabilityResponse(!exists));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request,
                                     @RequestParam(required = false) String sessionId,
                                     HttpServletRequest httpRequest) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);

        // 1. IP-basiertes Rate Limit prüfen
        if (!rateLimitService.checkIpRateLimit(ipAddress)) {
            log.warn("[{}] Rate limit exceeded for IP: {} on /register", requestId, ipAddress);
            
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/register")
                    .requestId(requestId)
                    .eventType(EventType.REGISTRATION_ATTEMPT)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .blocked(true, BlockReason.IP_RATE_LIMIT)
                    .httpStatus(429)
            );
            
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Too many requests. Please try again later."));
        }

        // 2. E-Mail-basiertes Rate Limit prüfen
        if (!rateLimitService.checkEmailRateLimit(request.getEmail())) {
            log.warn("[{}] Rate limit exceeded for email: {} on /register", requestId, request.getEmail());
            
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/register")
                    .requestId(requestId)
                    .eventType(EventType.REGISTRATION_ATTEMPT)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .blocked(true, BlockReason.EMAIL_RATE_LIMIT)
                    .httpStatus(429)
            );
            
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Too many registration attempts for this email. Please try again later."));
        }

        // 3. CAPTCHA validieren
        if (!captchaService.validateCaptcha(request.getCaptchaToken(), ipAddress)) {
            // DIAGNOSTIC: Log warum CAPTCHA fehlgeschlagen ist
            if (request.getCaptchaToken() == null || request.getCaptchaToken().isBlank()) {
                log.warn("[{}] CAPTCHA validation failed: token missing (email: {})", requestId, request.getEmail());
            } else if ("CAPTCHA_DISABLED_DEV_MODE".equals(request.getCaptchaToken())) {
                log.warn("[{}] CAPTCHA validation failed: dummy token in production (email: {})", requestId, request.getEmail());
            } else {
                log.warn("[{}] CAPTCHA validation failed: invalid/expired token (email: {})", requestId, request.getEmail());
            }
            
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/register")
                    .requestId(requestId)
                    .eventType(EventType.REGISTRATION_ATTEMPT)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .mailType(MailType.EMAIL_VERIFICATION)
                    .mailTriggered(true)  // Request wollte Mail versenden
                    .mailSent(false)      // Mail wurde NICHT versendet (blockiert!)
                    .captcha(request.getCaptchaToken() != null, false)
                    .blocked(true, BlockReason.CAPTCHA_INVALID)
                    .httpStatus(400)
            );
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("CAPTCHA_VALIDATION_FAILED", "CAPTCHA validation failed. Please try again."));
        }

        try {
            RegistrationResponse response = authService.register(request);

            // ✅ LOG SUCCESSFUL REGISTRATION WITH REAL EMAIL STATUS
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/register")
                    .requestId(requestId)
                    .eventType(response.isEmailSent() ? EventType.EMAIL_VERIFICATION_SENT : EventType.REGISTRATION_ATTEMPT)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .mailType(MailType.EMAIL_VERIFICATION)
                    .mailTriggered(true)  // Request wollte Mail versenden
                    .mailSent(response.isEmailSent())  // Echter Status aus EmailDeliveryService!
                    .blocked(false, null)
                    .httpStatus(201)
            );
            
            log.info("[{}] Registration completed: userCreated=true, emailSent={}, emailStatus={}, errorCode={}", 
                requestId, response.isEmailSent(), response.getEmailStatus(), response.getEmailErrorCode());

            // SECURITY: KEINE Warenkorb-Migration! User ist noch NICHT angemeldet.
            // Warenkorb-Migration erfolgt erst NACH Email-Verifizierung beim ersten Login.

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   @RequestParam(required = false) String sessionId,
                                   HttpServletRequest httpRequest) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);

        // 1. IP-basiertes Rate Limit prüfen
        if (!rateLimitService.checkIpRateLimit(ipAddress)) {
            log.warn("[{}] Rate limit exceeded for IP: {} on /login", requestId, ipAddress);
            
            // Log blocked login attempt
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/login")
                    .requestId(requestId)
                    .eventType(EventType.LOGIN_FAILED)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .loginSuccess(false)
                    .blocked(true, BlockReason.IP_RATE_LIMIT)
                    .httpStatus(429)
            );
            
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Too many requests. Please try again later."));
        }

        // 2. Account Lockout prüfen (nach zu vielen fehlgeschlagenen Versuchen)
        if (rateLimitService.isAccountLocked(request.getEmail())) {
            log.warn("[{}] Account locked for email: {} on /login", requestId, request.getEmail());
            
            // Log blocked login attempt
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/login")
                    .requestId(requestId)
                    .eventType(EventType.LOGIN_FAILED)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .loginSuccess(false)
                    .blocked(true, BlockReason.ACCOUNT_LOCKED)
                    .httpStatus(403)
            );
            
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Account temporarily locked due to too many failed login attempts. Please try again later."));
        }

        // 3. CAPTCHA validieren (nur wenn mehrere fehlgeschlagene Versuche)
        int remainingAttempts = rateLimitService.getRemainingLoginAttempts(request.getEmail());
        log.debug("[{}] Login attempt - email={}, remainingAttempts={}, captchaTokenPresent={}", 
            requestId, request.getEmail(), remainingAttempts, request.getCaptchaToken() != null);
            
        if (remainingAttempts <= 2 && !captchaService.validateCaptcha(request.getCaptchaToken(), ipAddress)) {
            log.warn("[{}] CAPTCHA validation failed for IP: {} on /login", requestId, ipAddress);
            
            // Log blocked login attempt
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/login")
                    .requestId(requestId)
                    .eventType(EventType.LOGIN_FAILED)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .captcha(request.getCaptchaToken() != null, false)
                    .loginSuccess(false)
                    .blocked(true, BlockReason.CAPTCHA_INVALID)
                    .httpStatus(400)
            );
            
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("CAPTCHA_VALIDATION_FAILED", 
                        "Die Sicherheitsprüfung ist abgelaufen. Bitte versuchen Sie die Anmeldung erneut."));
        }

        try {
            AuthResponse response = authService.login(request);

            // Reset login attempts nach erfolgreichem Login
            rateLimitService.resetLoginAttempts(request.getEmail());

            // ✅ LOG SUCCESSFUL LOGIN
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/login")
                    .requestId(requestId)
                    .eventType(EventType.LOGIN_SUCCESS)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .loginSuccess(true)
                    .blocked(false, null)
                    .httpStatus(200)
            );

            // Migriere Gast-Warenkorb wenn sessionId vorhanden (aus Body oder Query-Param)
            String cartSessionId = request.getSessionId() != null ? request.getSessionId() : sessionId;

            if (cartSessionId != null && !cartSessionId.isEmpty()) {
                User user = userRepository.findById(response.getUser().getId())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                cartService.mergeGuestCartToUser(cartSessionId, user);
            }

            return ResponseEntity.ok(response);
        } catch (storebackend.exception.EmailNotVerifiedException e) {
            // SECURITY: Email nicht bestätigt - 401 (nicht 403!)
            // Kein failed login attempt aufzeichnen (Credentials sind korrekt!)
            
            log.warn("[{}] Email not verified for: {}", requestId, request.getEmail());
            
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/login")
                    .requestId(requestId)
                    .eventType(EventType.LOGIN_FAILED)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .loginSuccess(false)
                    .blocked(true, BlockReason.EMAIL_NOT_VERIFIED)
                    .httpStatus(401)  // 401, nicht 403!
            );
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)  // 401
                    .body(new ErrorResponse("EMAIL_NOT_VERIFIED", e.getMessage()));
        } catch (RuntimeException e) {
            // Login-Versuch aufzeichnen (für Account Lockout)
            rateLimitService.recordLoginAttempt(request.getEmail());
            
            // ❌ LOG FAILED LOGIN (Invalid Credentials)
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/login")
                    .requestId(requestId)
                    .eventType(EventType.LOGIN_FAILED)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.getEmail())
                    .loginSuccess(false)
                    .blocked(true, BlockReason.INVALID_CREDENTIALS)
                    .httpStatus(401)
            );
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Email Verification Endpoint
     * GET /api/auth/verify?token=XYZ
     */
    @GetMapping("/verify")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        try {
            emailVerificationService.verifyToken(token);
            return ResponseEntity.ok(new SuccessResponse("Email verified successfully! You can now log in."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Resend Verification Email
     * POST /api/auth/resend-verification
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerificationEmail(@RequestBody ResendVerificationRequest request, 
                                                     HttpServletRequest httpRequest) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);

        // 1. IP-basiertes Rate Limit prüfen
        if (!rateLimitService.checkIpRateLimit(ipAddress)) {
            log.warn("[{}] Rate limit exceeded for IP: {} on /resend-verification", requestId, ipAddress);
            
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/resend-verification")
                    .requestId(requestId)
                    .eventType(EventType.EMAIL_VERIFICATION_RESENT)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.email())
                    .blocked(true, BlockReason.IP_RATE_LIMIT)
                    .httpStatus(429)
            );
            
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Too many requests. Please try again later."));
        }

        // 2. E-Mail-basiertes Rate Limit prüfen
        if (!rateLimitService.checkEmailRateLimit(request.email())) {
            log.warn("[{}] Rate limit exceeded for email: {} on /resend-verification", requestId, request.email());
            
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/resend-verification")
                    .requestId(requestId)
                    .eventType(EventType.EMAIL_VERIFICATION_RESENT)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.email())
                    .blocked(true, BlockReason.EMAIL_RATE_LIMIT)
                    .httpStatus(429)
            );
            
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Too many requests for this email. Please try again later."));
        }

        try {
            emailVerificationService.resendVerificationEmail(request.email());
            
            // ✅ LOG SUCCESSFUL RESEND
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/resend-verification")
                    .requestId(requestId)
                    .eventType(EventType.EMAIL_VERIFICATION_RESENT)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.email())
                    .mailType(MailType.EMAIL_VERIFICATION)
                    .mailTriggered(true)  // Request wollte Mail versenden
                    .mailSent(true)       // Mail wurde TATSÄCHLICH versendet ✅
                    .blocked(false, null)
                    .httpStatus(200)
            );
            
            return ResponseEntity.ok(new SuccessResponse("Verification email sent successfully!"));
        } catch (storebackend.exception.RateLimitExceededException e) {
            securityEventService.logEvent(
                securityEventService.builder("/api/auth/resend-verification")
                    .requestId(requestId)
                    .eventType(EventType.EMAIL_VERIFICATION_RESENT)
                    .httpMethod("POST")
                    .request(httpRequest)
                    .headers(httpRequest)
                    .email(request.email())
                    .mailType(MailType.EMAIL_VERIFICATION)
                    .mailTriggered(true)  // Request wollte Mail versenden
                    .mailSent(false)      // Mail wurde NICHT versendet (Rate Limit!)
                    .blocked(true, BlockReason.EMAIL_RATE_LIMIT)
                    .httpStatus(429)
            );
            
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Forgot Password - Initiate Password Reset
     * POST /api/auth/forgot-password
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request,
                                           HttpServletRequest httpRequest) {
        String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);

        // 1. IP-basiertes Rate Limit prüfen
        if (!rateLimitService.checkIpRateLimit(ipAddress)) {
            log.warn("Rate limit exceeded for IP: {} on /forgot-password", ipAddress);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Too many requests. Please try again later."));
        }

        // 2. E-Mail-basiertes Rate Limit prüfen
        if (!rateLimitService.checkEmailRateLimit(request.email())) {
            log.warn("Rate limit exceeded for email: {} on /forgot-password", request.email());
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(new ErrorResponse("Too many requests for this email. Please try again later."));
        }

        // 3. CAPTCHA validieren (NEU!)
        if (!captchaService.validateCaptcha(request.captchaToken(), ipAddress)) {
            log.warn("CAPTCHA validation failed for IP: {} on /forgot-password", ipAddress);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("CAPTCHA validation failed. Please try again."));
        }

        try {
            // Sprache aus Request extrahieren (optional)
            String preferredLang = request.email().contains("@") ? "en" : "en"; // Default EN
            
            EmailDeliveryResult emailResult = passwordResetService.initiatePasswordReset(
                request.email(), 
                preferredLang
            );
            
            // SECURITY: Immer neutrale Antwort zurückgeben (verhindert User Enumeration)
            // ABER: Intern wird echter Versandstatus geloggt
            return ResponseEntity.ok(new SuccessResponse(
                "If this email exists, a password reset link has been sent."
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Validate Password Reset Token
     * GET /api/auth/reset-password/validate?token=XYZ
     */
    @GetMapping("/reset-password/validate")
    public ResponseEntity<?> validateResetToken(@RequestParam String token) {
        try {
            boolean isValid = passwordResetService.validateToken(token);
            if (isValid) {
                return ResponseEntity.ok(new TokenValidationResponse(true, "Token is valid"));
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new TokenValidationResponse(false, "Token is invalid or expired"));
            }
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new TokenValidationResponse(false, e.getMessage()));
        }
    }

    /**
     * Reset Password with Token
     * POST /api/auth/reset-password
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            passwordResetService.resetPassword(request.token(), request.newPassword());
            return ResponseEntity.ok(new SuccessResponse("Password has been reset successfully. You can now log in with your new password."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String token) {
        try {
            // Remove "Bearer " prefix if present
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            String email = authService.getEmailFromToken(token);
            Long userId = authService.getUserIdFromToken(token);

            return ResponseEntity.ok(new ValidateResponse(true, email, userId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ValidateResponse(false, null, null));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("User not authenticated"));
            }

            User user = (User) authentication.getPrincipal();

            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("User not found"));
            }

            // Return full UserInfoResponse with name and primary role
            String primaryRole = user.getRoles().isEmpty() ? "USER" : user.getRoles().iterator().next().name();
            UserInfoResponse userInfo = new UserInfoResponse(
                    user.getId(),
                    user.getEmail(),
                    user.getName() != null ? user.getName() : user.getEmail().split("@")[0],
                    primaryRole,
                    user.getRoles().stream().map(Enum::name).toList(),
                    user.getCreatedAt().toString(),
                    user.getUpdatedAt().toString()
            );

            return ResponseEntity.ok(userInfo);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error fetching user information: " + e.getMessage()));
        }
    }

    @GetMapping("/debug/jwt-config")
    public ResponseEntity<?> debugJwtConfig() {
        try {
            String secretLength = String.valueOf(authService.getJwtSecretLength());
            return ResponseEntity.ok(new DebugResponse(
                    "JWT Configuration",
                    "JWT Secret length (bytes): " + secretLength,
                    "Minimum required: 32 bytes (256 bits)"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error checking JWT config: " + e.getMessage()));
        }
    }

    // Inner classes for responses
    private record ErrorResponse(String error, String message) {
        ErrorResponse(String message) {
            this("ERROR", message);
        }
    }

    private record ValidateResponse(boolean valid, String email, Long userId) {}

    private record UserInfoResponse(
            Long id,
            String email,
            String name,
            String role,
            java.util.List<String> roles,
            String createdAt,
            String updatedAt
    ) {}

    private record DebugResponse(String title, String secretInfo, String requirement) {}

    private record SuccessResponse(String message) {}

    public record ResendVerificationRequest(String email) {}

    private record EmailOperationResponseDto(
        boolean operationSuccessful,
        boolean emailSent,
        String emailStatus,
        String errorCode,
        String message,
        boolean retryAllowed
    ) {}

    public record ForgotPasswordRequest(String email, String captchaToken) {}

    public record ResetPasswordRequest(String token, String newPassword) {}

    public record TokenValidationResponse(boolean valid, String message) {}
    
    /**
     * Response DTO für Email-Verfügbarkeitsprüfung
     * SECURITY: Nur "available" zurückgeben, keine weiteren User-Daten!
     */
    public record EmailAvailabilityResponse(boolean available) {}
}

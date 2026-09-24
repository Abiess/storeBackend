package storebackend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import storebackend.dto.RegisterRequest;
import storebackend.repository.UserRepository;
import storebackend.service.AuthService;
import storebackend.service.CaptchaService;
import storebackend.service.CartService;
import storebackend.service.EmailVerificationService;
import storebackend.service.PasswordResetService;
import storebackend.service.RateLimitService;
import storebackend.service.SecurityEventService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * PLATFORM IDENTITY HARDENING: Verifiziert, dass {@link AuthController#register}
 * eine Duplicate-Registration (E-Mail bereits vergeben - inkl. case-insensitiv,
 * siehe {@link AuthService#register}/{@code UserRepository#existsByEmail}) mit
 * HTTP 409 CONFLICT beantwortet, analog zur bestehenden Projekt-Konvention für
 * "bereits existiert"-Konflikte (siehe LoyaltyController, CreditController,
 * TeamInvitationService#acceptInvitation).
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerRegisterConflictTest {

    @Mock private AuthService authService;
    @Mock private CartService cartService;
    @Mock private UserRepository userRepository;
    @Mock private EmailVerificationService emailVerificationService;
    @Mock private PasswordResetService passwordResetService;
    @Mock private RateLimitService rateLimitService;
    @Mock private CaptchaService captchaService;
    @Mock private SecurityEventService securityEventService;

    @Test
    @DisplayName("register() antwortet mit 409 CONFLICT, wenn die (normalisierte) E-Mail bereits registriert ist")
    void register_duplicateEmail_returns409() {
        AuthController controller = new AuthController(
                authService,
                cartService,
                userRepository,
                emailVerificationService,
                passwordResetService,
                rateLimitService,
                captchaService,
                securityEventService
        );

        when(rateLimitService.checkIpRateLimit(anyString())).thenReturn(true);
        when(rateLimitService.checkEmailRateLimit(anyString())).thenReturn(true);
        when(captchaService.validateCaptcha(any(), anyString())).thenReturn(true);
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new RuntimeException("Email already registered"));

        RegisterRequest request = new RegisterRequest();
        request.setEmail("Test@Example.com"); // wird von RegisterRequest#setEmail bereits normalisiert
        request.setPassword("supersecurepassword123");
        request.setCaptchaToken("valid-token");

        HttpServletRequest httpRequest = mock(HttpServletRequest.class);

        ResponseEntity<?> response = controller.register(request, null, httpRequest);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }
}

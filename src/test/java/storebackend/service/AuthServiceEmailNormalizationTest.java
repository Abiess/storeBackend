package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import storebackend.dto.EmailDeliveryResult;
import storebackend.dto.RegisterRequest;
import storebackend.dto.LoginRequest;
import storebackend.entity.Plan;
import storebackend.entity.User;
import storebackend.enums.AppAccessMode;
import storebackend.repository.PlanRepository;
import storebackend.repository.UserAppEntitlementRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.util.AppAccessChecker;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Verifiziert das geforderte End-to-End-Verhalten der E-Mail-Duplikat-
 * Prävention auf {@link AuthService}-Ebene (Register/Login), OHNE
 * Spring-Kontext (reines Mockito-Unit-Test, analog zu
 * {@code storebackend.util.AppAccessCheckerTest}):
 *
 * - register "test@example.com"      -> erfolgreich
 * - register "Test@Example.com"      -> abgelehnt (Duplikat, da bereits
 *                                        "test@example.com" existiert -
 *                                        bestehende Fehlerkonvention: siehe
 *                                        AuthController#register, das jede
 *                                        RuntimeException aus AuthService als
 *                                        HTTP 400 mit ErrorResponse mappt)
 * - login "test@example.com"          -> erfolgreich
 * - login "TEST@EXAMPLE.COM"          -> erfolgreich (case-insensitiv)
 * - führende/nachgestellte Leerzeichen -> werden vor der Suche normalisiert
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceEmailNormalizationTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private PlanRepository planRepository;
    @Mock
    private EmailVerificationService emailVerificationService;
    @Mock
    private UserAppEntitlementRepository userAppEntitlementRepository;
    @Mock
    private AppAccessChecker appAccessChecker;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
            userRepository,
            passwordEncoder,
            authenticationManager,
            jwtUtil,
            planRepository,
            emailVerificationService,
            userAppEntitlementRepository,
            appAccessChecker
        );
        // skipEmailVerificationForLogin ist @Value-injiziert (Default false in Produktion);
        // im reinen Unit-Test (kein Spring-Kontext) explizit setzen, damit login()
        // nicht an der EmailVerified-Prüfung scheitert.
        ReflectionTestUtils.setField(authService, "skipEmailVerificationForLogin", false);
    }

    private Plan freePlan() {
        Plan plan = new Plan();
        plan.setId(1L);
        plan.setName("FREE");
        return plan;
    }

    @Test
    @DisplayName("register('test@example.com') ist erfolgreich, wenn die normalisierte E-Mail noch nicht existiert")
    void register_newLowercaseEmail_succeeds() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("supersecurepassword123");

        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(planRepository.findByName("FREE")).thenReturn(Optional.of(freePlan()));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(emailVerificationService.createAndSendVerificationToken(any(User.class)))
            .thenReturn(EmailDeliveryResult.success());

        authService.register(request);

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        assertEquals("test@example.com", userCaptor.getValue().getEmail());
    }

    @Test
    @DisplayName("register('Test@Example.com') wird abgelehnt, wenn 'test@example.com' bereits existiert")
    void register_duplicateEmailDifferentCase_isRejected() {
        RegisterRequest request = new RegisterRequest();
        // RegisterRequest.setEmail normalisiert bereits selbst - existsByEmail
        // wird daher ohnehin nur mit der normalisierten Form aufgerufen.
        request.setEmail("Test@Example.com");
        request.setPassword("supersecurepassword123");

        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.register(request));
        assertEquals("Email already registered", ex.getMessage());

        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("login('test@example.com') ist erfolgreich")
    void login_lowercaseEmail_succeeds() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@example.com");
        request.setPassword("supersecurepassword123");

        User user = existingVerifiedUser("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(anyString(), any(Long.class), any())).thenReturn("jwt-token");
        when(appAccessChecker.getAccessMode(1L)).thenReturn(AppAccessMode.LEGACY);
        when(userAppEntitlementRepository.findByUserId(1L)).thenReturn(Collections.emptyList());

        var response = authService.login(request);

        assertEquals("test@example.com", response.getUser().getEmail());
    }

    @Test
    @DisplayName("login('TEST@EXAMPLE.COM') ist erfolgreich (case-insensitiv, gleicher User wie 'test@example.com')")
    void login_uppercaseEmail_isCaseInsensitive() {
        LoginRequest request = new LoginRequest();
        request.setEmail("TEST@EXAMPLE.COM"); // wird durch LoginRequest#setEmail bereits normalisiert
        request.setPassword("supersecurepassword123");

        User user = existingVerifiedUser("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(anyString(), any(Long.class), any())).thenReturn("jwt-token");
        when(appAccessChecker.getAccessMode(1L)).thenReturn(AppAccessMode.LEGACY);
        when(userAppEntitlementRepository.findByUserId(1L)).thenReturn(Collections.emptyList());

        var response = authService.login(request);

        assertEquals("test@example.com", response.getUser().getEmail());
        // Bestätigt, dass die Repository-Abfrage mit der NORMALISIERTEN E-Mail erfolgt,
        // nicht mit "TEST@EXAMPLE.COM".
        verify(userRepository).findByEmail("test@example.com");
    }

    @Test
    @DisplayName("login mit führenden/nachgestellten Leerzeichen wird normalisiert gesucht")
    void login_emailWithWhitespace_isNormalizedBeforeLookup() {
        LoginRequest request = new LoginRequest();
        request.setEmail("  test@example.com  "); // wird durch LoginRequest#setEmail getrimmt
        request.setPassword("supersecurepassword123");

        User user = existingVerifiedUser("test@example.com");
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(anyString(), any(Long.class), any())).thenReturn("jwt-token");
        when(appAccessChecker.getAccessMode(1L)).thenReturn(AppAccessMode.LEGACY);
        when(userAppEntitlementRepository.findByUserId(1L)).thenReturn(Collections.emptyList());

        authService.login(request);

        verify(userRepository).findByEmail("test@example.com");
    }

    private User existingVerifiedUser(String normalizedEmail) {
        User user = new User();
        user.setId(1L);
        user.setEmail(normalizedEmail);
        user.setPasswordHash("hashed");
        user.setEmailVerified(true);
        user.setRoles(Set.of(storebackend.enums.Role.USER));
        return user;
    }
}

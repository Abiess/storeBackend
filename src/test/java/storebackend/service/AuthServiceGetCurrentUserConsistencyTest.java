package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import storebackend.dto.AppEntitlementDTO;
import storebackend.dto.AuthResponse;
import storebackend.dto.LoginRequest;
import storebackend.entity.User;
import storebackend.entity.UserAppEntitlement;
import storebackend.enums.AppAccessMode;
import storebackend.enums.AppKey;
import storebackend.enums.Role;
import storebackend.entity.Store;
import storebackend.repository.PlanRepository;
import storebackend.repository.UserAppEntitlementRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.util.AppAccessChecker;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Regressionstest fuer die Auth-Persistenz-Korrektur (23.09.): stellt
 * sicher, dass `POST /api/auth/login` ({@link AuthService#login}) und
 * `GET /api/auth/me` ({@link AuthService#getCurrentUser}) fuer DENSELBEN
 * User exakt denselben App-Entitlement-Contract liefern
 * (appAccessMode, apps[].app/storeId/enabled) - beide nutzen jetzt
 * dieselbe interne {@code buildUserDTO}-Ermittlung, koennen also nicht
 * mehr wie zuvor auseinanderlaufen (vorher: `/me` nutzte ein eigenes,
 * schmaleres DTO ohne Entitlement-Felder).
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceGetCurrentUserConsistencyTest {

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
        ReflectionTestUtils.setField(authService, "skipEmailVerificationForLogin", false);
    }

    private User dhlEnabledUser() {
        User user = new User();
        user.setId(42L);
        user.setEmail("dhl-user@example.com");
        user.setName("DHL Betreiber");
        user.setPasswordHash("hashed");
        user.setEmailVerified(true);
        user.setRoles(Set.of(Role.USER));
        ReflectionTestUtils.setField(user, "createdAt", LocalDateTime.of(2026, 1, 1, 10, 0));
        ReflectionTestUtils.setField(user, "updatedAt", LocalDateTime.of(2026, 1, 2, 11, 0));
        return user;
    }

    private UserAppEntitlement dhlEntitlement(User user, long storeId, boolean enabled) {
        Store store = new Store();
        store.setId(storeId);
        UserAppEntitlement entitlement = new UserAppEntitlement();
        entitlement.setUser(user);
        entitlement.setStore(store);
        entitlement.setApp(AppKey.DHL);
        entitlement.setEnabled(enabled);
        return entitlement;
    }

    @Test
    @DisplayName("login() und getCurrentUser() liefern fuer denselben User identische appAccessMode/apps[]-Daten")
    void loginAndGetCurrentUser_returnConsistentEntitlementData() {
        User user = dhlEnabledUser();
        UserAppEntitlement entitlement = dhlEntitlement(user, 10L, true);

        when(userRepository.findByEmail("dhl-user@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(anyString(), any(Long.class), any())).thenReturn("jwt-token");
        when(appAccessChecker.getAccessMode(42L)).thenReturn(AppAccessMode.MANAGED);
        when(userAppEntitlementRepository.findByUserId(42L)).thenReturn(List.of(entitlement));

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("dhl-user@example.com");
        loginRequest.setPassword("supersecurepassword123");
        AuthResponse.UserDTO fromLogin = authService.login(loginRequest).getUser();

        AuthResponse.UserDTO fromMe = authService.getCurrentUser(user);

        // Kern-Anforderung: /me liefert dieselben Entitlement-Felder wie /login.
        assertEquals(fromLogin.getAppAccessMode(), fromMe.getAppAccessMode());
        assertEquals(AppAccessMode.MANAGED, fromMe.getAppAccessMode());

        assertEquals(1, fromMe.getApps().size());
        AppEntitlementDTO meEntitlement = fromMe.getApps().get(0);
        AppEntitlementDTO loginEntitlement = fromLogin.getApps().get(0);
        assertEquals(loginEntitlement.getApp(), meEntitlement.getApp());
        assertEquals(loginEntitlement.getStoreId(), meEntitlement.getStoreId());
        assertEquals(loginEntitlement.isEnabled(), meEntitlement.isEnabled());
        assertEquals(AppKey.DHL, meEntitlement.getApp());
        assertEquals(10L, meEntitlement.getStoreId());
        assertEquals(true, meEntitlement.isEnabled());

        // Bestehende /me-Felder (vor dieser Korrektur separat geliefert) bleiben erhalten.
        assertEquals(fromLogin.getId(), fromMe.getId());
        assertEquals(fromLogin.getEmail(), fromMe.getEmail());
        assertEquals(fromLogin.getName(), fromMe.getName());
        assertEquals(fromLogin.getRole(), fromMe.getRole());
        assertEquals(fromLogin.getRoles(), fromMe.getRoles());
        assertNotNull(fromMe.getCreatedAt());
        assertNotNull(fromMe.getUpdatedAt());
        assertEquals(fromLogin.getCreatedAt(), fromMe.getCreatedAt());
        assertEquals(fromLogin.getUpdatedAt(), fromMe.getUpdatedAt());
    }

    @Test
    @DisplayName("getCurrentUser() liefert fail-closed leere apps[]-Liste, wenn kein Entitlement existiert")
    void getCurrentUser_noEntitlements_returnsEmptyAppsList() {
        User user = dhlEnabledUser();

        when(appAccessChecker.getAccessMode(42L)).thenReturn(AppAccessMode.LEGACY);
        when(userAppEntitlementRepository.findByUserId(42L)).thenReturn(List.of());

        AuthResponse.UserDTO userDTO = authService.getCurrentUser(user);

        assertEquals(AppAccessMode.LEGACY, userDTO.getAppAccessMode());
        assertEquals(0, userDTO.getApps().size());
    }
}

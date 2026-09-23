package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.AppEntitlementDTO;
import storebackend.dto.AuthResponse;
import storebackend.dto.RegistrationResponse;
import storebackend.dto.LoginRequest;
import storebackend.dto.RegisterRequest;
import storebackend.entity.Plan;
import storebackend.entity.User;
import storebackend.entity.UserAppEntitlement;
import storebackend.enums.AppAccessMode;
import storebackend.enums.Role;
import storebackend.exception.EmailNotVerifiedException;
import storebackend.repository.PlanRepository;
import storebackend.repository.UserAppEntitlementRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.util.AppAccessChecker;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final PlanRepository planRepository;
    private final EmailVerificationService emailVerificationService;
    private final UserAppEntitlementRepository userAppEntitlementRepository;
    private final AppAccessChecker appAccessChecker;

    @Value("${email.verification.skip-for-login:false}")
    private boolean skipEmailVerificationForLogin;

    @Transactional
    public RegistrationResponse register(RegisterRequest request) {
        // Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered");
        }

        // Create new user
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmailVerified(false); // User muss Email verifizieren

        // Set name from email if not provided
        user.setName(request.getEmail().split("@")[0]);

        // Sprache setzen wenn mitgegeben (de/en/ar), sonst Default "en"
        if (request.getLang() != null && request.getLang().matches("de|en|ar")) {
            user.setPreferredLanguage(request.getLang());
        }

        // Set default role
        Set<Role> roles = new HashSet<>();
        roles.add(Role.USER);
        user.setRoles(roles);

        // Assign FREE plan by default
        Plan freePlan = planRepository.findByName("FREE")
                .orElseThrow(() -> new RuntimeException("FREE plan not found in database. Please run database initialization."));
        user.setPlan(freePlan);

        // Save user FIRST - muss committed sein bevor EmailVerification foreign key gesetzt wird
        user = userRepository.saveAndFlush(user);

        // SECURITY: KEIN JWT-Token mehr! User muss erst Email bestätigen
        // Send verification email in SAME transaction - gibt EmailDeliveryResult zurück
        storebackend.dto.EmailDeliveryResult emailResult = 
            emailVerificationService.createAndSendVerificationToken(user);

        // Return success response WITHOUT token, WITH masked email AND email status
        return RegistrationResponse.successWithEmailStatus(user.getEmail(), emailResult);
    }

    public AuthResponse login(LoginRequest request) {
        // Get user first to check email verification
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        // SECURITY: Check if email is verified BEFORE generating JWT
        // Auch wenn Passwort korrekt ist, KEIN Token für unbestätigte User
        if (!skipEmailVerificationForLogin && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new EmailNotVerifiedException();
        }

        // Authenticate user (Password-Check)
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );

        // Generate JWT token using JwtUtil with roles
        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());

        AuthResponse.UserDTO userDTO = buildUserDTO(user);

        return new AuthResponse(token, userDTO);
    }

    /**
     * Liefert denselben User-Contract wie {@link #login(LoginRequest)}
     * (inkl. {@code appAccessMode}/{@code apps}) fuer einen bereits
     * authentifizierten User (`GET /api/auth/me`).
     *
     * Beseitigt die vorherige Doppelstruktur, bei der `/me` ein eigenes,
     * schmaleres DTO (ohne Entitlement-Felder) gebaut hat - beide Endpunkte
     * nutzen jetzt exakt dieselbe Ermittlung ueber {@link #buildUserDTO}.
     */
    public AuthResponse.UserDTO getCurrentUser(User user) {
        return buildUserDTO(user);
    }

    public String getEmailFromToken(String token) {
        return jwtUtil.extractEmail(token);
    }

    public Long getUserIdFromToken(String token) {
        return jwtUtil.extractUserId(token);
    }

    public int getJwtSecretLength() {
        return jwtUtil.getSecretLength();
    }

    /**
     * Zentrale, einzige Stelle, die einen {@link User} in das Auth-Response-
     * DTO uebersetzt - inkl. App-Entitlement-Konzept (Phase 1:
     * {@code appAccessMode}/{@code apps}). Wird sowohl von {@link #login}
     * als auch von {@link #getCurrentUser} verwendet, damit `/login` und
     * `/me` niemals wieder auseinanderlaufen koennen.
     */
    private AuthResponse.UserDTO buildUserDTO(User user) {
        String primaryRole = user.getRoles().isEmpty() ? "USER" : user.getRoles().iterator().next().name();

        // App-Entitlement-Konzept (Phase 1): userweiter LEGACY/MANAGED-Modus
        // + Rohliste der expliziten Entitlement-Einträge (additiv, siehe AppAccessChecker)
        AppAccessMode appAccessMode = appAccessChecker.getAccessMode(user.getId());
        List<AppEntitlementDTO> apps = userAppEntitlementRepository.findByUserId(user.getId()).stream()
            .map(this::toAppEntitlementDTO)
            .collect(Collectors.toList());

        // Zuvor nur von /me angewandter Fallback (E-Mail-Praefix statt null),
        // hier fuer beide Endpunkte einheitlich uebernommen (siehe Doku am
        // createdAt/updatedAt-Feld oben - keine Feld-Regression bei /me).
        String name = user.getName() != null ? user.getName() : user.getEmail().split("@")[0];

        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
            user.getId(),
            user.getEmail(),
            name,
            primaryRole,
            user.getRoles().stream().map(Enum::name).collect(Collectors.toList()),
            appAccessMode,
            apps
        );
        // Zuvor nur von /me geliefert (siehe Doku am Feld) - additiv ergaenzt,
        // damit /me beim Umstieg auf dieses gemeinsame DTO nichts verliert.
        userDTO.setCreatedAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        userDTO.setUpdatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : null);
        return userDTO;
    }

    /**
     * App-Entitlement-Konzept (Phase 1): mappt einen rohen Entitlement-Eintrag
     * 1:1 in das additive Auth-Response-DTO (keine Ableitung/Auffüllung).
     */
    private AppEntitlementDTO toAppEntitlementDTO(UserAppEntitlement entitlement) {
        Long storeId = entitlement.getStore() != null ? entitlement.getStore().getId() : null;
        return new AppEntitlementDTO(entitlement.getApp(), storeId, entitlement.isEnabled());
    }
}

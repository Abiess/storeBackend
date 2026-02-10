package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.AuthResponse;
import storebackend.dto.LoginRequest;
import storebackend.dto.RegisterRequest;
import storebackend.entity.Plan;
import storebackend.entity.User;
import storebackend.enums.Role;
import storebackend.repository.PlanRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;

import java.util.HashSet;
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

    @Transactional
    public AuthResponse register(RegisterRequest request) {
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

        // Set default role
        Set<Role> roles = new HashSet<>();
        roles.add(Role.USER);
        user.setRoles(roles);

        // Assign FREE plan by default
        Plan freePlan = planRepository.findByName("FREE")
                .orElseThrow(() -> new RuntimeException("FREE plan not found in database. Please run database initialization."));
        user.setPlan(freePlan);

        // FIXED: Save and flush to ensure user is immediately available in DB
        user = userRepository.saveAndFlush(user);

        // Sende Verification-Email
        try {
            emailVerificationService.createAndSendVerificationToken(user);
        } catch (Exception e) {
            // Log error but don't fail registration - user can resend email later
            System.err.println("Failed to send verification email: " + e.getMessage());
        }

        // Generate JWT token using JwtUtil with roles
        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());

        // Create UserDTO with name and primary role
        String primaryRole = user.getRoles().isEmpty() ? "USER" : user.getRoles().iterator().next().name();
        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
            user.getId(),
            user.getEmail(),
            user.getName(),
            primaryRole,
            user.getRoles().stream().map(Enum::name).collect(Collectors.toList())
        );

        return new AuthResponse(token, userDTO);
    }

    public AuthResponse login(LoginRequest request) {
        // Get user first to check email verification
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        // Check if email is verified
        if (!user.getEmailVerified()) {
            throw new RuntimeException("Please verify your email address before logging in. Check your inbox for the verification link.");
        }

        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );

        // Generate JWT token using JwtUtil with roles
        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());

        // Create UserDTO with name and primary role
        String primaryRole = user.getRoles().isEmpty() ? "USER" : user.getRoles().iterator().next().name();
        AuthResponse.UserDTO userDTO = new AuthResponse.UserDTO(
            user.getId(),
            user.getEmail(),
            user.getName(),
            primaryRole,
            user.getRoles().stream().map(Enum::name).collect(Collectors.toList())
        );

        return new AuthResponse(token, userDTO);
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
}

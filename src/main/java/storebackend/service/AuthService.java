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
import storebackend.entity.User;
import storebackend.enums.Role;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

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

        // Set default role
        Set<Role> roles = new HashSet<>();
        roles.add(Role.USER);
        user.setRoles(roles);

        user = userRepository.save(user);

        // Generate JWT token using JwtUtil with roles
        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());

        return new AuthResponse(token, user.getEmail(), user.getId());
    }

    public AuthResponse login(LoginRequest request) {
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getEmail(),
                request.getPassword()
            )
        );

        // Get user
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate JWT token using JwtUtil with roles
        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());

        return new AuthResponse(token, user.getEmail(), user.getId());
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

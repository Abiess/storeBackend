package storebackend.service;

import org.springframework.stereotype.Service;
import storebackend.dto.PublicStoreDTO;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.enums.StoreStatus;
import storebackend.repository.DomainRepository;

@Service
public class PublicStoreService {

    private final DomainRepository domainRepository;

    public PublicStoreService(DomainRepository domainRepository) {
        this.domainRepository = domainRepository;
    }

    public PublicStoreDTO resolveStoreByHost(String host) {
        Domain domain = domainRepository.findByHost(host)
                .orElseThrow(() -> new RuntimeException("Store not found for this host"));

        Store store = domain.getStore();

        if (store.getStatus() != StoreStatus.ACTIVE) {
            throw new RuntimeException("Store is not active");
        }

        return new PublicStoreDTO(
                store.getId(),
                store.getName(),
                store.getSlug(),
                domain.getHost(),
                store.getStatus().name()
        );
    }
}
package storebackend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import storebackend.dto.*;
import storebackend.entity.User;
import storebackend.enums.Role;
import storebackend.repository.PlanRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;

import java.util.HashSet;
import java.util.Set;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PlanRepository planRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PlanRepository planRepository,
                      PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.planRepository = planRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        Set<Role> roles = new HashSet<>();
        roles.add(Role.ROLE_STORE_OWNER);
        user.setRoles(roles);

        // Assign FREE plan by default
        var freePlan = planRepository.findByName("FREE")
                .orElseThrow(() -> new RuntimeException("FREE plan not found"));
        user.setPlan(freePlan);

        user = userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return new AuthResponse(token, user.getEmail(), user.getId());
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getId());
        return new AuthResponse(token, user.getEmail(), user.getId());
    }

    public UserDTO getCurrentUser(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setRoles(user.getRoles());
        dto.setPlanName(user.getPlan() != null ? user.getPlan().getName() : null);
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
}


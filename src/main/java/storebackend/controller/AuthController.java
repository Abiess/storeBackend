package storebackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.AuthResponse;
import storebackend.dto.LoginRequest;
import storebackend.dto.RegisterRequest;
import storebackend.entity.User;
import storebackend.service.AuthService;
import storebackend.service.CartService;
import storebackend.repository.UserRepository;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final CartService cartService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request,
                                     @RequestParam(required = false) String sessionId) {
        try {
            AuthResponse response = authService.register(request);

            // Migriere Gast-Warenkorb wenn sessionId vorhanden
            if (sessionId != null && !sessionId.isEmpty()) {
                User user = userRepository.findById(response.getUser().getId())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                cartService.mergeGuestCartToUser(sessionId, user);
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   @RequestParam(required = false) String sessionId) {
        try {
            AuthResponse response = authService.login(request);

            // Migriere Gast-Warenkorb wenn sessionId vorhanden
            if (sessionId != null && !sessionId.isEmpty()) {
                User user = userRepository.findById(response.getUser().getId())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                cartService.mergeGuestCartToUser(sessionId, user);
            }

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid email or password"));
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
    private record ErrorResponse(String message) {}

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
}

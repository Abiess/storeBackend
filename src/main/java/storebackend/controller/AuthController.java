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
import storebackend.service.EmailVerificationService;
import storebackend.service.PasswordResetService;
import storebackend.repository.UserRepository;
import storebackend.util.IpAddressUtil;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final CartService cartService;
    private final UserRepository userRepository;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request,
                                     @RequestParam(required = false) String sessionId,
                                     HttpServletRequest httpRequest) {
        // Rate Limiting Check
        String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);


        try {
            AuthResponse response = authService.register(request);

            // Migriere Gast-Warenkorb wenn sessionId vorhanden (aus Body oder Query-Param)
            String cartSessionId = request.getSessionId() != null ? request.getSessionId() : sessionId;

            if (cartSessionId != null && !cartSessionId.isEmpty()) {
                User user = userRepository.findById(response.getUser().getId())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                cartService.mergeGuestCartToUser(cartSessionId, user);
            }

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
        // Rate Limiting Check
        String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);


        try {
            AuthResponse response = authService.login(request);

            // Reset login attempts nach erfolgreichem Login

            // Migriere Gast-Warenkorb wenn sessionId vorhanden (aus Body oder Query-Param)
            String cartSessionId = request.getSessionId() != null ? request.getSessionId() : sessionId;

            if (cartSessionId != null && !cartSessionId.isEmpty()) {
                User user = userRepository.findById(response.getUser().getId())
                        .orElseThrow(() -> new RuntimeException("User not found"));
                cartService.mergeGuestCartToUser(cartSessionId, user);
            }

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
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
    public ResponseEntity<?> resendVerificationEmail(@RequestBody ResendVerificationRequest request) {
        try {
            emailVerificationService.resendVerificationEmail(request.email());
            return ResponseEntity.ok(new SuccessResponse("Verification email sent successfully!"));
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
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            passwordResetService.initiatePasswordReset(request.email());
            // SECURITY: Immer success zurückgeben, auch wenn Email nicht existiert (verhindert User Enumeration)
            return ResponseEntity.ok(new SuccessResponse("If this email exists, a password reset link has been sent."));
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

    private record SuccessResponse(String message) {}

    public record ResendVerificationRequest(String email) {}

    public record ForgotPasswordRequest(String email) {}

    public record ResetPasswordRequest(String token, String newPassword) {}

    public record TokenValidationResponse(boolean valid, String message) {}
}

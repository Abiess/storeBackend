package storebackend.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.StoreCustomerLoginRequest;
import storebackend.service.*;
import storebackend.util.IpAddressUtil;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/public/stores/{storeId}/customer-session")
public class CustomerAppSessionController {
    private final CustomerAppSessionService sessions;
    private final RateLimitService limits;
    public record RefreshRequest(@NotBlank @Size(max = 128) String refreshToken) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@PathVariable Long storeId,
            @Valid @RequestBody StoreCustomerLoginRequest request, HttpServletRequest http) {
        if (!allowed(storeId, http)) return limited();
        try {
            return ResponseEntity.ok().header("Cache-Control", "no-store").body(sessions.login(storeId, request));
        } catch (StoreCustomerAccountService.InvalidStoreCustomerCredentialsException ex) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid customer credentials"));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@PathVariable Long storeId,
            @Valid @RequestBody RefreshRequest request, HttpServletRequest http) {
        if (!allowed(storeId, http)) return limited();
        try {
            return ResponseEntity.ok().header("Cache-Control", "no-store")
                .body(sessions.refresh(storeId, request.refreshToken()));
        } catch (CustomerAppSessionService.InvalidSessionException ex) {
            return ResponseEntity.status(401).body(Map.of("message", "Session expired"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@PathVariable Long storeId, @Valid @RequestBody RefreshRequest request) {
        sessions.revoke(storeId, request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    private boolean allowed(Long storeId, HttpServletRequest http) {
        return limits.checkIpRateLimit(IpAddressUtil.getClientIpAddress(http)) &&
            limits.checkStoreRateLimit(storeId);
    }
    private ResponseEntity<?> limited() {
        return ResponseEntity.status(429).body(Map.of("message", "Please try again later"));
    }
}

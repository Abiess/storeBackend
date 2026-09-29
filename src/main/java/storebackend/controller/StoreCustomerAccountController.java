package storebackend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CreateInvitedCustomerRequest;
import storebackend.dto.StoreCustomerLoginRequest;
import storebackend.service.StoreCustomerAccountService;
import storebackend.service.RateLimitService;
import storebackend.util.IpAddressUtil;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StoreCustomerAccountController {
    private final StoreCustomerAccountService accountService;
    private final RateLimitService rateLimitService;

    @PostMapping("/api/stores/{storeId}/customer-accounts")
    @PreAuthorize("@storeAccessChecker.isStoreAdmin(#storeId)")
    public ResponseEntity<?> create(@PathVariable Long storeId,
                                    @Valid @RequestBody CreateInvitedCustomerRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(storeId, request));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/api/public/stores/{storeId}/customer-login")
    public ResponseEntity<?> login(@PathVariable Long storeId,
                                   @Valid @RequestBody StoreCustomerLoginRequest request,
                                   HttpServletRequest httpRequest) {
        try {
            String ipAddress = IpAddressUtil.getClientIpAddress(httpRequest);
            if (!rateLimitService.checkIpRateLimit(ipAddress) || !rateLimitService.checkStoreRateLimit(storeId)) {
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many login attempts. Please try again later."));
            }
            return ResponseEntity.ok(accountService.login(storeId, request));
        } catch (StoreCustomerAccountService.InvalidStoreCustomerCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid customer ID/phone or password"));
        } catch (IllegalArgumentException | IllegalStateException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}

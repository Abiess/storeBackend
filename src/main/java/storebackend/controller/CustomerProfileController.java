package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CustomerProfileDTO;
import storebackend.dto.SaveAddressRequest;
import storebackend.dto.UpdateProfileRequest;
import storebackend.dto.PasswordChangeRequest;
import storebackend.entity.User;
import storebackend.service.CustomerProfileService;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/public/customer")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CustomerProfileController {

    private final CustomerProfileService customerProfileService;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                    .body(new ErrorResponse("User not authenticated"));
            }

            User user = (User) authentication.getPrincipal();
            CustomerProfileDTO profile = customerProfileService.getOrCreateProfile(user.getId());

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ErrorResponse("Error fetching profile: " + e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                    .body(new ErrorResponse("User not authenticated"));
            }

            User user = (User) authentication.getPrincipal();
            CustomerProfileDTO profile = customerProfileService.updateProfile(user.getId(), request);

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ErrorResponse("Error updating profile: " + e.getMessage()));
        }
    }

    @PostMapping("/profile/address")
    public ResponseEntity<?> saveAddress(@RequestBody SaveAddressRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                    .body(new ErrorResponse("User not authenticated"));
            }

            User user = (User) authentication.getPrincipal();
            CustomerProfileDTO profile = customerProfileService.saveAddress(user.getId(), request);

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ErrorResponse("Error saving address: " + e.getMessage()));
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody PasswordChangeRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                    .body(new ErrorResponse("User not authenticated"));
            }

            User user = (User) authentication.getPrincipal();
            customerProfileService.changePassword(user.getId(), request);

            return ResponseEntity.ok(Map.of("success", true, "message", "Password changed successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(400)
                .body(new ErrorResponse("Error changing password: " + e.getMessage()));
        }
    }

    @GetMapping("/orders")
    public ResponseEntity<?> getOrderHistory(@RequestParam String email) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                    .body(new ErrorResponse("User not authenticated"));
            }

            // TODO: Implement order history fetching
            return ResponseEntity.ok(List.of());
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ErrorResponse("Error fetching order history: " + e.getMessage()));
        }
    }

    private record ErrorResponse(String message) {}
}

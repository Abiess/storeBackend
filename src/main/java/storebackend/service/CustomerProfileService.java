package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CustomerProfileDTO;
import storebackend.dto.PasswordChangeRequest;
import storebackend.dto.SaveAddressRequest;
import storebackend.dto.UpdateProfileRequest;
import storebackend.entity.CustomerProfile;
import storebackend.entity.User;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.UserRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerProfileService {

    private final CustomerProfileRepository customerProfileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public CustomerProfileDTO getOrCreateProfile(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        CustomerProfile profile = customerProfileRepository.findByUserId(userId)
            .orElseGet(() -> {
                CustomerProfile newProfile = new CustomerProfile();
                newProfile.setUser(user);
                return customerProfileRepository.save(newProfile);
            });

        return toDTO(profile);
    }

    @Transactional
    public CustomerProfileDTO updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        CustomerProfile profile = customerProfileRepository.findByUserId(userId)
            .orElseGet(() -> {
                CustomerProfile newProfile = new CustomerProfile();
                newProfile.setUser(user);
                return newProfile;
            });

        profile.setFirstName(request.getFirstName());
        profile.setLastName(request.getLastName());
        profile.setPhone(request.getPhone());

        profile = customerProfileRepository.save(profile);
        return toDTO(profile);
    }

    @Transactional
    public CustomerProfileDTO saveAddress(Long userId, SaveAddressRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        CustomerProfile profile = customerProfileRepository.findByUserId(userId)
            .orElseGet(() -> {
                CustomerProfile newProfile = new CustomerProfile();
                newProfile.setUser(user);
                return newProfile;
            });

        // FIXED: Unterstütze beide Adressen gleichzeitig
        if (request.getShippingAddress() != null) {
            profile.setDefaultShippingAddress(request.getShippingAddress());
        }

        if (request.getBillingAddress() != null) {
            profile.setDefaultBillingAddress(request.getBillingAddress());
        }

        profile = customerProfileRepository.save(profile);
        return toDTO(profile);
    }

    @Transactional
    public void changePassword(Long userId, PasswordChangeRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        // Log input length (NO password characters!)
        log.info("[PASSWORD-CHANGE] userId={}, currentPwdLength={}, newPwdLength={}, trimmedNewLength={}",
            userId,
            request.getCurrentPassword() != null ? request.getCurrentPassword().length() : 0,
            request.getNewPassword() != null ? request.getNewPassword().length() : 0,
            request.getNewPassword() != null ? request.getNewPassword().trim().length() : 0
        );

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            log.warn("[PASSWORD-CHANGE] Current password mismatch for userId={}", userId);
            throw new RuntimeException("Current password is incorrect");
        }

        // Validate new password
        if (request.getNewPassword() == null || request.getNewPassword().trim().isEmpty()) {
            throw new RuntimeException("New password cannot be empty");
        }

        if (request.getNewPassword().length() < 8) {
            throw new RuntimeException("New password must be at least 8 characters long");
        }

        // Hash and set new password
        String encodedPassword = passwordEncoder.encode(request.getNewPassword());
        user.setPasswordHash(encodedPassword);
        userRepository.save(user);

        log.info("[PASSWORD-CHANGE] Password successfully changed for userId={}, hashPrefix={}",
            userId,
            encodedPassword.substring(0, Math.min(10, encodedPassword.length())) + "..."
        );
    }

    private CustomerProfileDTO toDTO(CustomerProfile profile) {
        CustomerProfileDTO dto = new CustomerProfileDTO();
        dto.setId(profile.getId());
        dto.setEmail(profile.getUser().getEmail());
        dto.setFirstName(profile.getFirstName());
        dto.setLastName(profile.getLastName());
        dto.setPhone(profile.getPhone());
        dto.setDefaultShippingAddress(profile.getDefaultShippingAddress());
        dto.setDefaultBillingAddress(profile.getDefaultBillingAddress());
        dto.setCreatedAt(profile.getCreatedAt() != null ? profile.getCreatedAt().toString() : null);
        dto.setUpdatedAt(profile.getUpdatedAt() != null ? profile.getUpdatedAt().toString() : null);
        return dto;
    }
}

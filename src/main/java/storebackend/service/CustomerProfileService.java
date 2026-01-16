package storebackend.service;

import lombok.RequiredArgsConstructor;
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

@Service
@RequiredArgsConstructor
public class CustomerProfileService {

    private final CustomerProfileRepository customerProfileRepository;
    private final UserRepository userRepository;

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

        // TODO: Verify current password matches
        // TODO: Hash new password
        // TODO: Update user password

        throw new RuntimeException("Password change not yet implemented");
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

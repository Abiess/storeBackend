package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.AuthResponse;
import storebackend.dto.CreateInvitedCustomerRequest;
import storebackend.dto.InvitedCustomerAccountDTO;
import storebackend.dto.LoginRequest;
import storebackend.dto.StoreCustomerLoginRequest;
import storebackend.entity.CustomerProfile;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.CustomerAccountMode;
import storebackend.enums.Role;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StoreCustomerAccountService {
    private final StoreRepository storeRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final AuthService authService;

    @Transactional
    public InvitedCustomerAccountDTO create(Long storeId, CreateInvitedCustomerRequest request) {
        Store store = requireInviteOnlyStore(storeId);
        String loginId;
        do {
            loginId = "C-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 8).toUpperCase(Locale.ROOT);
        } while (customerProfileRepository.findByStoreIdAndLoginIdIgnoreCase(storeId, loginId).isPresent());

        User user = new User();
        user.setEmail("invite-" + UUID.randomUUID() + "@customer.invalid");
        user.setName(request.getName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmailVerified(true);
        user.setRoles(new HashSet<>(Set.of(Role.USER)));
        user = userRepository.save(user);

        CustomerProfile profile = new CustomerProfile();
        profile.setUser(user);
        profile.setStore(store);
        profile.setFirstName(request.getName().trim());
        profile.setPhone(normalizePhone(request.getPhone()));
        profile.setLoginId(loginId);
        customerProfileRepository.save(profile);
        return new InvitedCustomerAccountDTO(loginId, request.getName().trim(), profile.getPhone());
    }

    @Transactional(readOnly = true)
    public AuthResponse login(Long storeId, StoreCustomerLoginRequest request) {
        requireInviteOnlyStore(storeId);
        String identifier = request.getIdentifier().trim();
        CustomerProfile profile = customerProfileRepository
            .findByStoreIdAndLoginIdIgnoreCase(storeId, identifier)
            .orElseGet(() -> findUniquePhoneMatch(storeId, normalizePhone(identifier)));

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                profile.getUser().getEmail(), request.getPassword()));
        } catch (AuthenticationException ex) {
            throw new InvalidStoreCustomerCredentialsException();
        }

        LoginRequest login = new LoginRequest();
        login.setEmail(profile.getUser().getEmail());
        login.setPassword(request.getPassword());
        AuthResponse response = authService.login(login);
        // This account has no email address; do not expose its internal auth alias.
        response.getUser().setEmail(null);
        return response;
    }

    private Store requireInviteOnlyStore(Long storeId) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found"));
        if (store.getCustomerAccountMode() != CustomerAccountMode.INVITE_ONLY) {
            throw new IllegalStateException("Store does not use invite-only customer accounts");
        }
        return store;
    }

    private CustomerProfile findUniquePhoneMatch(Long storeId, String phone) {
        if (phone == null || phone.isBlank()) throw new InvalidStoreCustomerCredentialsException();
        var matches = customerProfileRepository.findByStoreIdAndPhone(storeId, phone);
        if (matches.size() != 1) throw new InvalidStoreCustomerCredentialsException();
        return matches.get(0);
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        return phone.replaceAll("[\\s()-]", "");
    }

    public static class InvalidStoreCustomerCredentialsException extends RuntimeException {
        public InvalidStoreCustomerCredentialsException() { super("Invalid customer ID/phone or password"); }
    }
}

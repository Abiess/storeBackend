package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import storebackend.dto.AuthResponse;
import storebackend.dto.StoreCustomerLoginRequest;
import storebackend.entity.CustomerProfile;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.CustomerAccountMode;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class StoreCustomerAccountLoginTest {
    private final StoreRepository stores = mock(StoreRepository.class);
    private final CustomerProfileRepository profiles = mock(CustomerProfileRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final AuthenticationManager authentication = mock(AuthenticationManager.class);
    private final AuthService auth = mock(AuthService.class);
    private final StoreCustomerAccountService service =
        new StoreCustomerAccountService(stores, profiles, users, passwords, authentication, auth);

    private CustomerProfile profile;

    @BeforeEach
    void setup() {
        var store = new Store();
        store.setId(121L);
        store.setCustomerAccountMode(CustomerAccountMode.INVITE_ONLY);
        when(stores.findById(121L)).thenReturn(Optional.of(store));
        var user = new User();
        user.setEmail("invite-test@customer.invalid");
        profile = new CustomerProfile();
        profile.setUser(user);
        when(auth.login(any())).thenReturn(new AuthResponse("token",
            new AuthResponse.UserDTO(1L, "invite-test@customer.invalid", "kunde1", "USER", List.of("USER"))));
    }

    private StoreCustomerLoginRequest request(String identifier) {
        var request = new StoreCustomerLoginRequest();
        request.setIdentifier(identifier);
        request.setPassword("test-password");
        return request;
    }

    @Test
    void acceptsUniqueCustomerNameCaseInsensitively() {
        when(profiles.findByStoreIdAndLoginIdIgnoreCase(121L, "KUNDE1")).thenReturn(Optional.empty());
        when(profiles.findByStoreIdAndFirstNameIgnoreCase(121L, "KUNDE1")).thenReturn(List.of(profile));
        var response = service.login(121L, request("KUNDE1"));
        assertEquals("token", response.getToken());
        assertNull(response.getUser().getEmail());
        verify(authentication).authenticate(any());
    }

    @Test
    void preservesLoginIdAuthentication() {
        when(profiles.findByStoreIdAndLoginIdIgnoreCase(121L, "C-4C2B6CCE")).thenReturn(Optional.of(profile));
        service.login(121L, request("C-4C2B6CCE"));
        verify(profiles, never()).findByStoreIdAndFirstNameIgnoreCase(any(), any());
    }

    @Test
    void rejectsDuplicateCustomerNames() {
        when(profiles.findByStoreIdAndFirstNameIgnoreCase(121L, "kunde1"))
            .thenReturn(List.of(profile, new CustomerProfile()));
        assertThrows(StoreCustomerAccountService.InvalidStoreCustomerCredentialsException.class,
            () -> service.login(121L, request("kunde1")));
        verifyNoInteractions(authentication);
    }
}

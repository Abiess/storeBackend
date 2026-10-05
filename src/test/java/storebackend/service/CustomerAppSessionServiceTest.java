package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.dto.*;
import storebackend.entity.*;
import storebackend.enums.*;
import storebackend.repository.*;
import storebackend.security.JwtUtil;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CustomerAppSessionServiceTest {
    private final StoreCustomerAccountService accounts = mock(StoreCustomerAccountService.class);
    private final CustomerAppSessionRepository sessions = mock(CustomerAppSessionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final StoreRepository stores = mock(StoreRepository.class);
    private final CustomerProfileRepository profiles = mock(CustomerProfileRepository.class);
    private final JwtUtil jwt = mock(JwtUtil.class);
    private final CustomerAppSessionService service = new CustomerAppSessionService(accounts, sessions, users, stores, profiles, jwt);

    private CustomerAppSession issued() {
        var user = new User();
        user.setId(42L); user.setEmail("customer@test.invalid");
        user.setPasswordHash("password-hash"); user.setEmailVerified(true);
        user.setRoles(Set.of(Role.USER));
        when(users.findById(42L)).thenReturn(Optional.of(user));
        var store = new Store(); store.setId(7L);
        store.setCustomerAccountMode(CustomerAccountMode.INVITE_ONLY);
        when(stores.findById(7L)).thenReturn(Optional.of(store));
        when(profiles.findByUserIdAndStoreId(42L, 7L)).thenReturn(Optional.of(new CustomerProfile()));
        when(jwt.generateCustomerAccessToken(anyString(), anyLong(), anySet())).thenReturn("access");
        when(accounts.login(eq(7L), any())).thenReturn(new AuthResponse("old",
            new AuthResponse.UserDTO(42L, null, "Customer", "USER", List.of("USER"))));
        var capture = org.mockito.ArgumentCaptor.forClass(CustomerAppSession.class);
        service.login(7L, new StoreCustomerLoginRequest());
        verify(sessions).save(capture.capture());
        return capture.getValue();
    }

    @Test void storesOnlyHashAndAllowsRenewalAfterAccessExpiry() {
        var session = issued();
        assertEquals(64, session.getTokenHash().length());
        assertNotEquals("password-hash", session.getPasswordFingerprint());
        session.setExpiresAt(Instant.now().plusSeconds(10));
        when(sessions.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        var renewed = service.refresh(7L, "random-secret");
        assertEquals("access", renewed.token());
        assertEquals("random-secret", renewed.refreshToken());
        assertTrue(session.getExpiresAt().isAfter(Instant.now().plusSeconds(89 * 86400L)));
        // A response lost in transit can be retried with the same secret.
        assertEquals("access", service.refresh(7L, "random-secret").token());
    }

    @Test void rejectsExpiredRevokedAndWrongStoreSessions() {
        var session = issued();
        when(sessions.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        assertThrows(CustomerAppSessionService.InvalidSessionException.class,
            () -> service.refresh(8L, "secret"));
        session.setExpiresAt(Instant.now().minusSeconds(1));
        assertThrows(CustomerAppSessionService.InvalidSessionException.class,
            () -> service.refresh(7L, "secret"));
        session.setExpiresAt(Instant.now().plusSeconds(100));
        session.setRevoked(true);
        assertThrows(CustomerAppSessionService.InvalidSessionException.class,
            () -> service.refresh(7L, "secret"));
    }

    @Test void rejectsChangedPasswordAndRemovedMembership() {
        var session = issued();
        when(sessions.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        var user = users.findById(42L).orElseThrow();
        user.setPasswordHash("new-password");
        assertThrows(CustomerAppSessionService.InvalidSessionException.class,
            () -> service.refresh(7L, "secret"));
        user.setPasswordHash("password-hash");
        when(profiles.findByUserIdAndStoreId(42L, 7L)).thenReturn(Optional.empty());
        assertThrows(CustomerAppSessionService.InvalidSessionException.class,
            () -> service.refresh(7L, "secret"));
    }

    @Test void logoutRevokesOnlyTheMatchingStore() {
        var session = issued();
        when(sessions.findByTokenHash(anyString())).thenReturn(Optional.of(session));
        service.revoke(8L, "secret");
        assertFalse(session.isRevoked());
        service.revoke(7L, "secret");
        assertTrue(session.isRevoked());
    }
}

package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.StoreCustomerLoginRequest;
import storebackend.entity.CustomerAppSession;
import storebackend.enums.CustomerAccountMode;
import storebackend.repository.*;
import storebackend.security.JwtUtil;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class CustomerAppSessionService {
    private final StoreCustomerAccountService accounts;
    private final CustomerAppSessionRepository sessions;
    private final UserRepository users;
    private final StoreRepository stores;
    private final CustomerProfileRepository profiles;
    private final JwtUtil jwt;
    // Sliding inactivity window. Active sessions can keep renewing.
    private static final long IDLE_DAYS = 90;

    public record SessionResponse(String token, String refreshToken) {}
    public static class InvalidSessionException extends RuntimeException {}

    @Transactional
    public SessionResponse login(Long storeId, StoreCustomerLoginRequest request) {
        var auth = accounts.login(storeId, request);
        var user = users.findById(auth.getUser().getId()).orElseThrow(InvalidSessionException::new);
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var session = new CustomerAppSession();
        session.setTokenHash(hash(refresh));
        session.setUserId(user.getId());
        session.setStoreId(storeId);
        session.setPasswordFingerprint(hash(user.getPasswordHash()));
        session.setExpiresAt(Instant.now().plus(IDLE_DAYS, ChronoUnit.DAYS));
        sessions.save(session);
        return new SessionResponse(jwt.generateCustomerAccessToken(user.getEmail(), user.getId(), user.getRoles()), refresh);
    }

    @Transactional
    public SessionResponse refresh(Long storeId, String refreshToken) {
        var session = sessions.findByTokenHash(hash(refreshToken)).orElseThrow(InvalidSessionException::new);
        if (session.isRevoked() || !storeId.equals(session.getStoreId()) ||
            !session.getExpiresAt().isAfter(Instant.now())) throw new InvalidSessionException();
        var user = users.findById(session.getUserId()).orElseThrow(InvalidSessionException::new);
        var store = stores.findById(storeId).orElseThrow(InvalidSessionException::new);
        if (store.getCustomerAccountMode() != CustomerAccountMode.INVITE_ONLY ||
            !Boolean.TRUE.equals(user.getEmailVerified()) ||
            !hash(user.getPasswordHash()).equals(session.getPasswordFingerprint()) ||
            profiles.findByUserIdAndStoreId(user.getId(), storeId).isEmpty()) {
            throw new InvalidSessionException();
        }
        session.setExpiresAt(Instant.now().plus(IDLE_DAYS, ChronoUnit.DAYS));
        // Stable random refresh secret: retrying after a lost response remains safe.
        // Only its SHA-256 hash is stored; it is never accepted as an access JWT.
        return new SessionResponse(jwt.generateCustomerAccessToken(user.getEmail(), user.getId(), user.getRoles()), refreshToken);
    }

    @Transactional
    public void revoke(Long storeId, String refreshToken) {
        sessions.findByTokenHash(hash(refreshToken)).ifPresent(session -> {
            if (storeId.equals(session.getStoreId())) session.setRevoked(true);
        });
    }

    private static String hash(String value) {
        if (value == null || value.isBlank()) throw new InvalidSessionException();
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}

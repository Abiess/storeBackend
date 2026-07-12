package storebackend.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Rate Limiting Service zum Schutz vor automatisierten Registrierungen,
 * Brute-Force-Angriffen und Spam.
 *
 * Verwendet Bucket4j (Token Bucket Algorithm) + Caffeine Cache
 */
@Service
@Slf4j
public class RateLimitService {

    // IP-basiertes Rate Limiting (Register, Login, Password-Reset)
    private final Cache<String, Bucket> ipBucketCache;

    // E-Mail-basiertes Rate Limiting (Register, Resend Verification)
    private final Cache<String, Bucket> emailBucketCache;

    // Store-basiertes Rate Limiting (Store Creation, Public API)
    private final Cache<Long, Bucket> storeBucketCache;

    // Account Lockout nach zu vielen fehlgeschlagenen Login-Versuchen
    private final ConcurrentMap<String, Integer> loginAttempts = new ConcurrentHashMap<>();
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);

    public RateLimitService() {
        // IP Rate Limit: 10 Requests pro Minute pro IP (Auth-Endpunkte)
        this.ipBucketCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(5))
            .maximumSize(10_000)
            .build();

        // Email Rate Limit: 3 Registrierungen pro Stunde pro E-Mail
        this.emailBucketCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofHours(1))
            .maximumSize(50_000)
            .build();

        // Store Rate Limit: 100 Requests pro Minute pro Store (Public API)
        this.storeBucketCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofMinutes(5))
            .maximumSize(10_000)
            .build();
    }

    /**
     * Prüft IP-basiertes Rate Limit (für Auth-Endpunkte)
     * @param ipAddress IP-Adresse
     * @return true wenn erlaubt, false wenn Limit überschritten
     */
    public boolean checkIpRateLimit(String ipAddress) {
        Bucket bucket = ipBucketCache.get(ipAddress, k -> createIpBucket());
        boolean allowed = bucket.tryConsume(1);
        
        if (!allowed) {
            log.warn("IP Rate Limit exceeded for IP: {}", ipAddress);
        }
        
        return allowed;
    }

    /**
     * Prüft E-Mail-basiertes Rate Limit (für Registrierung + Resend)
     * @param email E-Mail-Adresse
     * @return true wenn erlaubt, false wenn Limit überschritten
     */
    public boolean checkEmailRateLimit(String email) {
        Bucket bucket = emailBucketCache.get(email.toLowerCase(), k -> createEmailBucket());
        boolean allowed = bucket.tryConsume(1);
        
        if (!allowed) {
            log.warn("Email Rate Limit exceeded for email: {}", email);
        }
        
        return allowed;
    }

    /**
     * Prüft Store-basiertes Rate Limit (für öffentliche API-Zugriffe)
     * @param storeId Store ID
     * @return true wenn erlaubt, false wenn Limit überschritten
     */
    public boolean checkStoreRateLimit(Long storeId) {
        Bucket bucket = storeBucketCache.get(storeId, k -> createStoreBucket());
        boolean allowed = bucket.tryConsume(1);
        
        if (!allowed) {
            log.warn("Store Rate Limit exceeded for Store ID: {}", storeId);
        }
        
        return allowed;
    }

    /**
     * Login-Versuch aufzeichnen (für Account Lockout)
     * @param email E-Mail-Adresse
     */
    public void recordLoginAttempt(String email) {
        String key = email.toLowerCase();
        loginAttempts.merge(key, 1, Integer::sum);
        
        int attempts = loginAttempts.getOrDefault(key, 0);
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            log.warn("Account lockout triggered for email: {} after {} failed attempts", email, attempts);
        }
    }

    /**
     * Login-Versuche zurücksetzen (nach erfolgreichem Login)
     * @param email E-Mail-Adresse
     */
    public void resetLoginAttempts(String email) {
        loginAttempts.remove(email.toLowerCase());
    }

    /**
     * Prüft, ob Account gesperrt ist (nach zu vielen fehlgeschlagenen Login-Versuchen)
     * @param email E-Mail-Adresse
     * @return true wenn gesperrt, false wenn nicht gesperrt
     */
    public boolean isAccountLocked(String email) {
        int attempts = loginAttempts.getOrDefault(email.toLowerCase(), 0);
        return attempts >= MAX_LOGIN_ATTEMPTS;
    }

    /**
     * Gibt verbleibende Login-Versuche zurück
     * @param email E-Mail-Adresse
     * @return Anzahl verbleibender Versuche
     */
    public int getRemainingLoginAttempts(String email) {
        int attempts = loginAttempts.getOrDefault(email.toLowerCase(), 0);
        return Math.max(0, MAX_LOGIN_ATTEMPTS - attempts);
    }

    // ── Private Helper-Methoden ──

    private Bucket createIpBucket() {
        // 10 Requests pro Minute pro IP
        Bandwidth limit = Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1)));
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }

    private Bucket createEmailBucket() {
        // 3 Registrierungen pro Stunde pro E-Mail
        Bandwidth limit = Bandwidth.classic(3, Refill.intervally(3, Duration.ofHours(1)));
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }

    private Bucket createStoreBucket() {
        // 100 Requests pro Minute pro Store (öffentliche API)
        Bandwidth limit = Bandwidth.classic(100, Refill.intervally(100, Duration.ofMinutes(1)));
        return Bucket.builder()
            .addLimit(limit)
            .build();
    }
}

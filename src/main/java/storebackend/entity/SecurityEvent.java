package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;
import storebackend.enums.EventType;
import storebackend.enums.MailType;
import storebackend.enums.BlockReason;
import storebackend.enums.RateLimitType;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;

/**
 * Security Event Entity - Tracking für sicherheitsrelevante Vorgänge
 * 
 * Speichert Versuche auf geschützte Endpoints (Register, Login, Password Reset, etc.)
 * für Audit, Monitoring und Incident Response.
 * 
 * DSGVO-konform: Keine vollständigen E-Mails, nur maskierte Versionen + Domain + Hash
 */
@Entity
@Table(name = "security_events", indexes = {
    @Index(name = "idx_security_events_created_at", columnList = "created_at"),
    @Index(name = "idx_security_events_endpoint", columnList = "endpoint"),
    @Index(name = "idx_security_events_client_ip", columnList = "client_ip"),
    @Index(name = "idx_security_events_blocked", columnList = "blocked"),
    @Index(name = "idx_security_events_event_type", columnList = "event_type"),
    @Index(name = "idx_security_events_email_hash", columnList = "email_hash")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "request_id", length = 100)
    private String requestId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 50)
    private EventType eventType;
    
    @Column(name = "http_method", length = 10)
    private String httpMethod;

    @Column(name = "endpoint", nullable = false, length = 200)
    private String endpoint;
    
    // ══════════════════════════════════════════════════════════════════════════════════
    // IP INFORMATION (Multi-Proxy-Support für genaue IP-Tracking)
    // ══════════════════════════════════════════════════════════════════════════════════

    @Column(name = "client_ip", length = 50)
    private String clientIp; // Berechnete echte IP (aus IpAddressUtil)
    
    @Column(name = "remote_addr", length = 50)
    private String remoteAddr; // HttpServletRequest.getRemoteAddr()
    
    @Column(name = "x_forwarded_for", length = 200)
    private String xForwardedFor; // X-Forwarded-For Header (volle Kette)
    
    @Column(name = "x_real_ip", length = 50)
    private String xRealIp; // X-Real-IP Header (NGINX)

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "email_masked", length = 100)
    private String emailMasked; // z.B. "ab***@example.com"

    @Column(name = "email_domain", length = 100)
    private String emailDomain; // z.B. "example.com"

    @Column(name = "phone_masked", length = 50)
    private String phoneMasked; // z.B. "+49***1234"

    @Column(name = "captcha_present")
    private Boolean captchaPresent;

    @Column(name = "captcha_valid")
    private Boolean captchaValid;

    @Column(name = "honeypot_triggered")
    private Boolean honeypotTriggered;

    @Enumerated(EnumType.STRING)
    @Column(name = "rate_limit_type", length = 50)
    private RateLimitType rateLimitType; // IP, EMAIL, DOMAIN, PHONE, ENDPOINT

    @Column(name = "blocked", nullable = false)
    private Boolean blocked; // true = Request wurde blockiert

    @Enumerated(EnumType.STRING)
    @Column(name = "block_reason", length = 200)
    private BlockReason blockReason; // CAPTCHA_INVALID, IP_RATE_LIMIT, etc.

    @Column(name = "mail_triggered")
    private Boolean mailTriggered; // true = E-Mail wurde gesendet (trotz potenziellem Spam)

    @Column(name = "http_status")
    private Integer httpStatus; // HTTP-Statuscode der Antwort

    @Column(name = "store_id")
    private Long storeId; // Optional: falls Request Store-bezogen ist

    @Column(name = "user_id")
    private Long userId; // Optional: falls User bekannt ist
    
    // ══════════════════════════════════════════════════════════════════════════════════
    // ERWEITERTE FELDER - Incident Response & Grafana
    // ══════════════════════════════════════════════════════════════════════════════════
    
    @Column(name = "email_hash", length = 64)
    private String emailHash; // SHA-256 hash for analytics (nicht für Security!)
    
    @Enumerated(EnumType.STRING)
    @Column(name = "mail_type", length = 50)
    private MailType mailType; // STORE_ACCESS, EMAIL_VERIFICATION, PASSWORD_RESET, etc.
    
    @Column(name = "mail_triggered")
    private Boolean mailTriggered; // true = Request wollte Mail versenden (unabhängig ob blockiert)
    
    @Column(name = "mail_sent")
    private Boolean mailSent; // true = Mail wurde TATSÄCHLICH erfolgreich versendet (nur wenn !blocked)
    
    @Column(name = "kill_switch_triggered")
    private Boolean killSwitchTriggered; // Emergency Kill Switch aktiv
    
    @Column(name = "circuit_breaker_triggered")
    private Boolean circuitBreakerTriggered; // Circuit Breaker hat geblockt
    
    @Column(name = "login_success")
    private Boolean loginSuccess; // Bei Login-Events: erfolgreich?
    
    @Column(name = "risk_score")
    private Integer riskScore; // 0-100, optional für Bot-Detection
    
    @Column(name = "origin", length = 200)
    private String origin; // Origin-Header
    
    @Column(name = "referer", length = 500)
    private String referer; // Referer-Header
    
    // ── GeoIP / ASN Data ──
    
    @Column(name = "country_code", length = 2)
    private String countryCode; // ISO country code (DE, US, CN)
    
    @Column(name = "country_name", length = 100)
    private String countryName; // Country name (Germany, United States)
    
    @Column(name = "city", length = 100)
    private String city; // City name (Berlin, New York)
    
    @Column(name = "latitude")
    private Double latitude; // Latitude coordinate
    
    @Column(name = "longitude")
    private Double longitude; // Longitude coordinate
    
    @Column(name = "continent", length = 50)
    private String continent; // Continent (Europe, North America)
    
    @Column(name = "asn")
    private Integer asn; // Autonomous System Number
    
    @Column(name = "asn_org", length = 200)
    private String asnOrg; // ASN Organization (Hetzner, AWS, OVH)
    
    @Column(name = "isp", length = 200)
    private String isp; // Internet Service Provider
    
    @Column(name = "cloud_provider", length = 50)
    private String cloudProvider; // AWS, Google Cloud, Azure, etc.
    
    @Column(name = "is_hosting_provider")
    private Boolean isHostingProvider; // True if from known hosting/cloud provider

    // ── Helper-Methoden ──

    /**
     * Maskiert E-Mail-Adresse für Logging (DSGVO-konform)
     * Beispiel: "test@example.com" → "te***@example.com"
     */
    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        
        String[] parts = email.split("@");
        String local = parts[0];
        String domain = parts[1];
        
        if (local.length() <= 2) {
            return "***@" + domain;
        }
        
        return local.substring(0, 2) + "***@" + domain;
    }

    /**
     * Maskiert Telefonnummer für Logging
     * Beispiel: "+491234567890" → "+49***7890"
     */
    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 6) {
            return null;
        }
        
        // Zeige ersten 3 und letzten 4 Zeichen
        return phone.substring(0, 3) + "***" + phone.substring(phone.length() - 4);
    }

    /**
     * Extrahiert Domain aus E-Mail
     */
    public static String extractDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        return email.substring(email.lastIndexOf("@") + 1).toLowerCase();
    }
}

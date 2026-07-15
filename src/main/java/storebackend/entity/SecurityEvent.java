package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Security Event Entity - Tracking für sicherheitsrelevante Vorgänge
 * 
 * Speichert Versuche auf geschützte Endpoints (Register, Login, Password Reset, etc.)
 * für Audit, Monitoring und Incident Response.
 * 
 * DSGVO-konform: Keine vollständigen E-Mails, nur maskierte Versionen + Domain
 */
@Entity
@Table(name = "security_events", indexes = {
    @Index(name = "idx_security_events_created_at", columnList = "created_at"),
    @Index(name = "idx_security_events_endpoint", columnList = "endpoint"),
    @Index(name = "idx_security_events_client_ip", columnList = "client_ip"),
    @Index(name = "idx_security_events_blocked", columnList = "blocked")
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
    private String requestId; // Optional: für Request-Tracing

    @Column(name = "endpoint", nullable = false, length = 200)
    private String endpoint; // z.B. "/api/auth/register", "/api/public/create-store/save-email"

    @Column(name = "client_ip", length = 50)
    private String clientIp; // IP-Adresse (anonymisiert nach Bedarf)

    @Column(name = "forwarded_for", length = 200)
    private String forwardedFor; // X-Forwarded-For Header (für Proxy-Setups)

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

    @Column(name = "rate_limit_type", length = 50)
    private String rateLimitType; // "ip", "email", "domain", "phone", "endpoint"

    @Column(name = "blocked", nullable = false)
    private Boolean blocked; // true = Request wurde blockiert

    @Column(name = "block_reason", length = 200)
    private String blockReason; // z.B. "CAPTCHA failed", "Rate limit exceeded", "Honeypot triggered"

    @Column(name = "mail_triggered")
    private Boolean mailTriggered; // true = E-Mail wurde gesendet (trotz potenziellem Spam)

    @Column(name = "http_status")
    private Integer httpStatus; // HTTP-Statuscode der Antwort

    @Column(name = "store_id")
    private Long storeId; // Optional: falls Request Store-bezogen ist

    @Column(name = "user_id")
    private Long userId; // Optional: falls User bekannt ist

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

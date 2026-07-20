package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.PaymentProvider;
import storebackend.enums.PaymentMode;
import storebackend.enums.ConnectionStatus;

import java.time.LocalDateTime;

/**
 * StorePaymentConfiguration - Store-spezifische Payment-Provider-Konfiguration
 * 
 * Für Phase 1A: Nur Sandbox-Modus mit globalen Credentials
 * Später: Merchant-Account-ID und verschlüsselte Store-spezifische Credentials
 */
@Entity
@Table(
    name = "store_payment_configurations",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_store_payment_provider",
            columnNames = {"store_id", "provider"}
        )
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StorePaymentConfiguration {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false, length = 30)
    private PaymentProvider provider;

    /**
     * Ist dieser Provider für den Store aktiviert?
     */
    @Column(name = "enabled", nullable = false)
    private boolean enabled = false;

    /**
     * Sandbox (Test) oder Live (Produktion)
     * Phase 1A: Nur SANDBOX erlaubt
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "mode", length = 10, nullable = false)
    private PaymentMode mode = PaymentMode.SANDBOX;

    /**
     * Merchant Account ID (z.B. PayPal Merchant ID)
     * Für Phase 1A: Optional (global config wird verwendet)
     * Später: Verpflichtend für Live-Modus
     */
    @Column(name = "merchant_account_id", length = 100)
    private String merchantAccountId;

    /**
     * Status der Verbindung zum Provider
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "connection_status", length = 20, nullable = false)
    private ConnectionStatus connectionStatus = ConnectionStatus.NOT_CONNECTED;

    /**
     * Verschlüsselte Credentials oder Secret-Reference
     * NIEMALS im Klartext speichern!
     * Phase 1A: NULL (globale Config aus Environment)
     */
    @Column(name = "encrypted_credentials_ref", columnDefinition = "TEXT")
    private String encryptedCredentialsRef;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * Letzter Verbindungstest
     */
    @Column(name = "last_checked_at")
    private LocalDateTime lastCheckedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

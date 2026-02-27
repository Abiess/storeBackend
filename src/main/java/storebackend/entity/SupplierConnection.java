package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.SupplierType;

import java.time.LocalDateTime;

/**
 * Supplier Connection - API Credentials pro Store
 * Speichert Tokens für CJ, AliExpress, etc.
 */
@Entity
@Table(name = "supplier_connections")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Der Store dem diese Connection gehört
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /**
     * Supplier Type (CJ, ALIEXPRESS, etc.)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "supplier_type", nullable = false, length = 20)
    private SupplierType supplierType;

    /**
     * API Key (für CJ: email)
     */
    @Column(name = "api_key", length = 500)
    private String apiKey;

    /**
     * API Secret (für CJ: password hash oder token)
     */
    @Column(name = "api_secret", length = 500)
    private String apiSecret;

    /**
     * Access Token (OAuth oder Bearer Token)
     */
    @Column(name = "access_token", columnDefinition = "TEXT")
    private String accessToken;

    /**
     * Refresh Token (für Token-Refresh)
     */
    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;

    /**
     * Wann der Access Token abläuft
     */
    @Column(name = "token_expires_at")
    private LocalDateTime tokenExpiresAt;

    /**
     * Ist die Connection aktiv?
     */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Prüfe ob Token noch gültig ist
     */
    public boolean isTokenValid() {
        if (!isActive || accessToken == null) {
            return false;
        }
        if (tokenExpiresAt == null) {
            return true; // Kein Ablaufdatum = gültig
        }
        return LocalDateTime.now().isBefore(tokenExpiresAt);
    }
}


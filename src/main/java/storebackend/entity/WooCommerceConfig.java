package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * WooCommerce Shop-Konfiguration (Connection Settings).
 * 
 * Security:
 * - consumerSecret wird NIEMALS im DTO zurückgegeben (nur maskiert)
 * - consumerSecret sollte verschlüsselt gespeichert werden (TODO: JPA Converter)
 * - Nur Store Owner darf Config speichern/laden
 */
@Entity
@Table(
    name = "woocommerce_configs",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_woocommerce_config_store",
        columnNames = {"store_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WooCommerceConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false,
        foreignKey = @ForeignKey(name = "fk_woocommerce_config_store",
            foreignKeyDefinition = "FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE"))
    private Store store;

    /**
     * WooCommerce Shop URL (z.B. https://example.com)
     */
    @Column(name = "shop_url", nullable = false, length = 500)
    private String shopUrl;

    /**
     * WooCommerce REST API Consumer Key (ck_...)
     */
    @Column(name = "consumer_key", nullable = false, length = 255)
    private String consumerKey;

    /**
     * WooCommerce REST API Consumer Secret (cs_...)
     * 
     * SECURITY:
     * - NIEMALS loggen
     * - NIEMALS im DTO ans Frontend senden
     * - TODO: Verschlüsselt speichern (JPA Converter + AES)
     */
    @Column(name = "consumer_secret", nullable = false, length = 255)
    private String consumerSecret;

    /**
     * Ist diese Konfiguration aktiv?
     */
    @Column(name = "enabled", nullable = false)
    private boolean enabled = false;  // boolean (nicht Boolean!)

    /**
     * Letzte erfolgreiche Test-Connection (für Health-Check)
     */
    @Column(name = "last_test_success_at")
    private LocalDateTime lastTestSuccessAt;

    /**
     * WooCommerce Version (erkannt bei Test Connection)
     */
    @Column(name = "wc_version", length = 20)
    private String wcVersion;

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
}

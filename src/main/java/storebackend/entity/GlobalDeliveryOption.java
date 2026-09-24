package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Platform-wide delivery option managed by the platform admin.
 * These options are shown in the storefront checkout for all stores.
 * Store managers cannot modify these – only the platform owner can.
 */
@Entity
@Table(name = "global_delivery_options")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GlobalDeliveryOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Display name, e.g. "Standard Lieferung", "Express Lieferung", "Abholung" */
    @Column(nullable = false, length = 100)
    private String name;

    /** Short description shown to the customer */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** Delivery type: PICKUP | STANDARD | EXPRESS | SAME_DAY */
    @Column(name = "delivery_type", nullable = false, length = 30)
    private String deliveryType = "STANDARD";

    /** Price in MAD (or store's currency) */
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    /** Estimated delivery time in days (min) */
    @Column(name = "eta_min_days")
    private Integer etaMinDays;

    /** Estimated delivery time in days (max) */
    @Column(name = "eta_max_days")
    private Integer etaMaxDays;

    /** Icon/emoji displayed next to the option */
    @Column(name = "icon", length = 10)
    private String icon = "🚚";

    /** Whether this option is currently active and shown in storefront */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /** Display sort order (lower = first) */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 100;

    /** Website-URL des Lieferunternehmens */
    @Column(name = "website_url", columnDefinition = "TEXT")
    private String websiteUrl;

    /** Logo: MinIO-Objektpfad (dauerhaft) */
    @Column(name = "logo_object_name", columnDefinition = "TEXT")
    private String logoObjectName;

    /** Logo: generierte presigned URL (wird on-the-fly gesetzt) */
    @Column(name = "logo_url", columnDefinition = "TEXT")
    private String logoUrl;

    /** WhatsApp-Nummer des Supports */
    @Column(name = "whatsapp_number", length = 30)
    private String whatsappNumber;

    /** Social Media Links */
    @Column(name = "instagram_url", columnDefinition = "TEXT")
    private String instagramUrl;

    @Column(name = "facebook_url", columnDefinition = "TEXT")
    private String facebookUrl;

    @Column(name = "tiktok_url", columnDefinition = "TEXT")
    private String tiktokUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}


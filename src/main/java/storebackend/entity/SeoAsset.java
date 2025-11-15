package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * SEO-related assets (OG images, favicons, etc.) stored in MinIO.
 */
@Entity
@Table(name = "seo_assets", indexes = {
    @Index(name = "idx_seo_asset_store", columnList = "store_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeoAsset {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private AssetType type;

    @Column(name = "path", nullable = false, length = 500)
    private String path; // MinIO path

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum AssetType {
        OG_IMAGE,
        FAVICON,
        APPLE_TOUCH_ICON
    }
}
package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * SEO settings per store, optionally scoped to specific domain.
 * Domain-specific settings override store-level defaults.
 * Includes social meta, hreflang, and canonical configuration.
 */
@Entity
@Table(name = "seo_settings", indexes = {
    @Index(name = "idx_seo_store", columnList = "store_id"),
    @Index(name = "idx_seo_domain", columnList = "domain_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeoSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "domain_id")
    private Long domainId; // null = store-level default

    @Column(name = "site_name", length = 200)
    private String siteName;

    @Column(name = "default_title_template", length = 500)
    private String defaultTitleTemplate; // e.g., "{{product.title}} | {{store.siteName}}"

    @Column(name = "default_meta_description", length = 1000)
    private String defaultMetaDescription;

    @Column(name = "canonical_base_url", length = 500)
    private String canonicalBaseUrl; // e.g., "https://myshop.markt.ma"

    @Column(name = "robots_index", nullable = false)
    @Builder.Default
    private Boolean robotsIndex = true;

    // Social settings
    @Column(name = "og_default_image_path", length = 500)
    private String ogDefaultImagePath; // MinIO path

    @Column(name = "twitter_handle", length = 100)
    private String twitterHandle; // @username

    @Column(name = "facebook_page_url", length = 500)
    private String facebookPageUrl;

    @Column(name = "instagram_url", length = 500)
    private String instagramUrl;

    @Column(name = "youtube_url", length = 500)
    private String youtubeUrl;

    @Column(name = "linkedin_url", length = 500)
    private String linkedinUrl;

    // Hreflang configuration (stored as JSON array)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "hreflang_config", columnDefinition = "jsonb")
    @Builder.Default
    private List<HreflangEntry> hreflangConfig = new ArrayList<>();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Version
    @Column(name = "version")
    private Long version; // Optimistic locking for caching

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HreflangEntry {
        private String langCode; // e.g., "de", "en-US"
        private String absoluteUrlBase; // e.g., "https://myshop.de"
    }
}


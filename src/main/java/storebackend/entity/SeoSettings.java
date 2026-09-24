package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * SEO settings per store: meta description, keywords, social media cards, etc.
 */
@Entity
@Table(name = "seo_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeoSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false, unique = true)
    private Long storeId;

    // ─── Grundeinstellungen ────────────────────────────────
    @Column(name = "site_name", length = 255)
    private String siteName;

    @Column(name = "meta_title", length = 255)
    private String metaTitle;

    @Column(name = "default_title_template", length = 255)
    private String defaultTitleTemplate;

    @Column(name = "meta_description", length = 500)
    private String metaDescription;

    @Column(name = "meta_keywords", length = 500)
    private String metaKeywords;

    @Column(name = "canonical_base_url", length = 500)
    private String canonicalBaseUrl;

    // ─── Open Graph / Social ──────────────────────────────
    @Column(name = "og_image_url", length = 1000)
    private String ogImageUrl;

    @Column(name = "og_default_image_path", length = 1000)
    private String ogDefaultImagePath;

    @Column(name = "twitter_handle", length = 100)
    private String twitterHandle;

    @Column(name = "facebook_page_url", length = 500)
    private String facebookPageUrl;

    @Column(name = "instagram_url", length = 500)
    private String instagramUrl;

    @Column(name = "youtube_url", length = 500)
    private String youtubeUrl;

    @Column(name = "linkedin_url", length = 500)
    private String linkedinUrl;

    // ─── Technical SEO ────────────────────────────────────
    @Column(name = "robots_txt", columnDefinition = "TEXT")
    private String robotsTxt;

    @Column(name = "sitemap_enabled", nullable = false)
    @Builder.Default
    private Boolean sitemapEnabled = true;

    @Column(name = "robots_index", nullable = false)
    @Builder.Default
    private Boolean robotsIndex = true;

    /** JSON-Array: [{langCode:"de", absoluteUrlBase:"https://..."}, ...] */
    @Column(name = "hreflang_config", columnDefinition = "TEXT")
    private String hreflangConfig;

    // ─── Timestamps ───────────────────────────────────────
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

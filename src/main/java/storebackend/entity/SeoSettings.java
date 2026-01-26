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

    @Column(name = "meta_title", length = 255)
    private String metaTitle;

    @Column(name = "meta_description", length = 500)
    private String metaDescription;

    @Column(name = "meta_keywords", length = 500)
    private String metaKeywords;

    @Column(name = "og_image_url", length = 1000)
    private String ogImageUrl;

    @Column(name = "twitter_handle", length = 100)
    private String twitterHandle;

    @Column(name = "robots_txt", columnDefinition = "TEXT")
    private String robotsTxt;

    @Column(name = "sitemap_enabled", nullable = false)
    @Builder.Default
    private Boolean sitemapEnabled = true;

    @Column(name = "robots_index", nullable = false)
    @Builder.Default
    private Boolean robotsIndex = true;

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

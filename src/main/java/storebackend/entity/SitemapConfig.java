package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Sitemap generation configuration per store/domain.
 * Controls which content types are included and pagination threshold.
 */
@Entity
@Table(name = "sitemap_configs", indexes = {
    @Index(name = "idx_sitemap_store", columnList = "store_id"),
    @Index(name = "idx_sitemap_domain", columnList = "domain_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SitemapConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "domain_id")
    private Long domainId;

    @Column(name = "include_products", nullable = false)
    private Boolean includeProducts = true;

    @Column(name = "include_collections", nullable = false)
    private Boolean includeCollections = true;

    @Column(name = "include_blog", nullable = false)
    private Boolean includeBlog = true;

    @Column(name = "include_pages", nullable = false)
    private Boolean includePages = true;

    @Column(name = "split_threshold", nullable = false)
    private Integer splitThreshold = 5000; // URLs per sitemap file

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

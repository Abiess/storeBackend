package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * URL redirect rules per store/domain.
 * Supports 301/302, regex patterns, and priority ordering.
 * Domain-specific rules override store-level rules.
 */
@Entity
@Table(name = "redirect_rules", indexes = {
    @Index(name = "idx_redirect_store", columnList = "store_id"),
    @Index(name = "idx_redirect_domain", columnList = "domain_id"),
    @Index(name = "idx_redirect_active", columnList = "is_active"),
    @Index(name = "idx_redirect_priority", columnList = "priority")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RedirectRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Column(name = "domain_id")
    private Long domainId; // null = applies to all domains

    @Column(name = "source_path", nullable = false, length = 1000)
    private String sourcePath; // e.g., "/old-product" or regex pattern

    @Column(name = "target_url", nullable = false, length = 1000)
    private String targetUrl; // absolute or relative

    @Column(name = "http_code", nullable = false)
    @Builder.Default
    private Integer httpCode = 301; // 301 or 302

    @Column(name = "is_regex", nullable = false)
    @Builder.Default
    private Boolean isRegex = false;

    @Column(name = "priority", nullable = false)
    @Builder.Default
    private Integer priority = 100; // Lower = higher priority (evaluated first)

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "comment", length = 500)
    private String comment;

    @Column(name = "tag", length = 100)
    private String tag; // For grouping/filtering

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}


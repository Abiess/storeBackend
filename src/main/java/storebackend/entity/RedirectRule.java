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
    private Integer httpCode = 301; // 301 or 302

    @Column(name = "is_regex", nullable = false)
    private Boolean regex = false;

    @Column(name = "priority", nullable = false)
    private Integer priority = 100; // Lower = higher priority (evaluated first)

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "comment", length = 500)
    private String comment;

    @Column(name = "tag", length = 100)
    private String tag; // For grouping/filtering

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Explizite Getter für Boolean-Felder (Lombok-Kompatibilität)
    public Boolean getRegex() {
        return regex;
    }

    public void setRegex(Boolean regex) {
        this.regex = regex;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    // Weitere explizite Getter/Setter
    public Long getId() {
        return id;
    }

    public Long getStoreId() {
        return storeId;
    }

    public void setStoreId(Long storeId) {
        this.storeId = storeId;
    }

    public Long getDomainId() {
        return domainId;
    }

    public void setDomainId(Long domainId) {
        this.domainId = domainId;
    }

    public String getSourcePath() {
        return sourcePath;
    }

    public void setSourcePath(String sourcePath) {
        this.sourcePath = sourcePath;
    }

    public String getTargetUrl() {
        return targetUrl;
    }

    public void setTargetUrl(String targetUrl) {
        this.targetUrl = targetUrl;
    }

    public Integer getHttpCode() {
        return httpCode;
    }

    public void setHttpCode(Integer httpCode) {
        this.httpCode = httpCode;
    }

    public Integer getPriority() {
        return priority;
    }

    public void setPriority(Integer priority) {
        this.priority = priority;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}

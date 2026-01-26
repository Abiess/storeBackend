package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * JSON-LD structured data templates with Mustache-style variables.
 * Used for rendering schema.org markup on storefront pages.
 */
@Entity
@Table(name = "structured_data_templates", indexes = {
    @Index(name = "idx_struct_store_type", columnList = "store_id,type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StructuredDataTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false)
    private Long storeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private TemplateType type;

    @Column(name = "template_json", nullable = false, columnDefinition = "TEXT")
    private String templateJson; // Mustache template with variables like {{product.title}}

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

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

    public enum TemplateType {
        PRODUCT,
        ORGANIZATION,
        BREADCRUMB,
        ARTICLE,
        COLLECTION
    }
}

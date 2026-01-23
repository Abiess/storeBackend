package storebackend.entity;

import jakarta.persistence.*;
import lombok.Data;
import storebackend.enums.DeliveryProviderType;
import java.time.LocalDateTime;

/**
 * Delivery provider configuration for a store
 */
@Entity
@Table(name = "delivery_providers", indexes = {
    @Index(name = "idx_store_active_priority", columnList = "store_id,is_active,priority")
})
@Data
public class DeliveryProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private DeliveryProviderType type;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "priority", nullable = false)
    private Integer priority = 100;

    @Column(name = "config_json", columnDefinition = "TEXT")
    private String configJson;

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


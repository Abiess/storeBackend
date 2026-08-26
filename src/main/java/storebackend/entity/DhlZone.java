package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DHL Zone Entity (Phase 3A)
 * 
 * Repräsentiert einen Bereich/Zone im Lager
 * 
 * Beispiele:
 * - "Regal links"
 * - "Regal rechts"
 * - "Regal hinten"
 * - "Boden"
 * - "Großpakete"
 * 
 * MULTI-TENANT:
 * - Jede Zone gehört zu einem Store
 * - Namen sind store-spezifisch
 */
@Entity
@Table(
    name = "dhl_zones",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"store_id", "name"})
    },
    indexes = {
        @Index(name = "idx_dhl_zone_store", columnList = "store_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlZone {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /**
     * Zonen-Name
     * Beispiele: "Regal links", "Shelf A", "رف أيسر"
     */
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * Farbe für visuelle Darstellung (optional)
     * Beispiel: "#667eea", "#764ba2"
     */
    @Column(name = "color", length = 20)
    private String color;

    /**
     * Sortierreihenfolge
     */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

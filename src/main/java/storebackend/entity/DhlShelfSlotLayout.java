package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DHL Shelf Slot Layout Entity (Phase 3A)
 * 
 * Speichert die visuelle Position eines Lagerplatzes im Regalplan
 * 
 * WICHTIG:
 * - DhlShelfSlot.id bleibt die stabile fachliche Identität
 * - Layout-Änderungen verändern NIEMALS Paketzuordnungen
 * - Ein Slot kann ohne Layout existieren (Fallback: Liste)
 * 
 * GRID-BASIERT:
 * - x, y = Grid-Position (0-basiert)
 * - width, height = Grid-Spans
 *   - 1 = S (klein)
 *   - 2 = M (mittel)
 *   - 3 = L (groß)
 *   - 4 = XL (extra groß)
 * 
 * BEISPIEL:
 * Slot A1: x=0, y=0, width=1, height=1 (S)
 * Slot B3: x=2, y=1, width=2, height=1 (M)
 * Slot XL1: x=0, y=3, width=4, height=2 (XL)
 * 
 * MULTI-TENANT:
 * - Jedes Layout gehört zu einem Store
 * - Slot muss zum selben Store gehören
 */
@Entity
@Table(
    name = "dhl_shelf_slot_layouts",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"store_id", "shelf_slot_id"})
    },
    indexes = {
        @Index(name = "idx_dhl_layout_store", columnList = "store_id"),
        @Index(name = "idx_dhl_layout_slot", columnList = "shelf_slot_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlShelfSlotLayout {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /**
     * Referenz zum Lagerplatz
     * 
     * STABIL: shelfSlot.id ändert sich nie
     * Verschieben im Plan ändert nur x/y hier
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelf_slot_id", nullable = false)
    private DhlShelfSlot shelfSlot;

    /**
     * Grid X-Position (0-basiert)
     */
    @Column(name = "grid_x", nullable = false)
    private Integer gridX;

    /**
     * Grid Y-Position (0-basiert)
     */
    @Column(name = "grid_y", nullable = false)
    private Integer gridY;

    /**
     * Grid-Breite (Spans)
     * 1 = S, 2 = M, 3 = L, 4 = XL
     */
    @Column(name = "grid_width", nullable = false)
    private Integer gridWidth = 1;

    /**
     * Grid-Höhe (Spans)
     * 1 = S, 2 = M, 3 = L, 4 = XL
     */
    @Column(name = "grid_height", nullable = false)
    private Integer gridHeight = 1;

    /**
     * Zone/Bereich (optional)
     * Beispiel: "Regal links", "Regal hinten"
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private DhlZone zone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        
        if (this.gridWidth == null) {
            this.gridWidth = 1;
        }
        if (this.gridHeight == null) {
            this.gridHeight = 1;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

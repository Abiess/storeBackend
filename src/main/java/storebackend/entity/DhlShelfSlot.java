package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DHL Shelf Slot Entity
 * 
 * Repräsentiert einen physischen Lagerplatz für DHL-Pakete
 * 
 * MULTI-TENANT:
 * - Jeder Slot gehört zu einem Store
 * - Slot-Codes (A1, A2...) sind pro Store eindeutig
 * 
 * KONFIGURIERBAR:
 * - Stores können unterschiedliche Layouts haben
 * - sortOrder bestimmt automatische Zuweisung
 * - active = true/false zum Deaktivieren
 * 
 * BELEGUNG:
 * - Wird NICHT redundant gespeichert
 * - Ein Slot gilt als belegt wenn DhlParcel mit:
 *   - shelfSlotId = dieser Slot
 *   - status = STORED
 *   existiert
 * 
 * BEISPIELE:
 * Store 121: A1-A6, B1-B7, C1-C7 (21 Slots)
 * Store 122: R1-R20 (20 Slots)
 * Store 123: S01-S50 (50 Slots)
 */
@Entity
@Table(
    name = "dhl_shelf_slots",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"store_id", "code"})
    },
    indexes = {
        @Index(name = "idx_dhl_slot_store_active_order", columnList = "store_id, active, sort_order")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlShelfSlot {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /**
     * Slot-Code
     * Beispiele: "A1", "A2", "B1", "R15", "S01"
     * Pro Store eindeutig
     */
    @Column(name = "code", nullable = false, length = 10)
    private String code;

    /**
     * Sortierreihenfolge für automatische Zuweisung
     * 
     * Beispiel:
     * A1 = 1
     * A2 = 2
     * ...
     * B1 = 7
     * B2 = 8
     * 
     * Bestimmt: "Welcher Slot wird als nächstes zugewiesen?"
     * Nicht String-Sortierung (sonst A10 < A2)!
     */
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    /**
     * Aktiv / Verfügbar
     * 
     * true  = Slot kann genutzt werden
     * false = Slot temporär deaktiviert (z.B. Regal in Reparatur)
     */
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    /**
     * Kapazität: Wie viele Pakete passen in diesen Slot?
     * 
     * Phase 2.1: Mehrere Pakete pro Lagerplatz
     * 
     * Beispiele:
     * - capacity = 1: Nur 1 Paket (Standard)
     * - capacity = 3: Bis zu 3 Pakete
     * - capacity = 5: Großes Fach für 5 Pakete
     * 
     * Status:
     * - occupiedCount = 0            → FREE (grün)
     * - 0 < occupiedCount < capacity → PARTIAL (gelb)
     * - occupiedCount >= capacity    → FULL (rot)
     * 
     * Default: 1 (für Kompatibilität mit Phase 2.0)
     */
    @Column(name = "capacity", nullable = false)
    private Integer capacity = 1;

    /**
     * Optionale Beschreibung
     * z.B. "Regal links oben", "Backoffice Schrank"
     */
    @Column(name = "description", length = 200)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        
        if (this.active == null) {
            this.active = true;
        }
        
        if (this.capacity == null) {
            this.capacity = 1; // Default für Kompatibilität
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

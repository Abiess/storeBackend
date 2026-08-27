package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.DhlParcelStatus;

import java.time.LocalDateTime;

/**
 * DHL Parcel Entity
 * 
 * Verwaltung von DHL-Abholpaketen im Shop
 * 
 * MULTI-TENANT:
 * - Jedes Paket ist einem Store zugeordnet (storeId)
 * - trackingCode ist pro Store eindeutig
 * 
 * NORMALISIERUNG:
 * - Tracking-Codes werden vor dem Speichern normalisiert:
 *   - uppercase
 *   - Leerzeichen entfernt
 *   - führendes (J) entfernt falls vorhanden
 */
@Entity
@Table(
    name = "dhl_parcels",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"store_id", "tracking_code"})
    },
    indexes = {
        @Index(name = "idx_dhl_store_status", columnList = "store_id, status"),
        @Index(name = "idx_dhl_tracking", columnList = "tracking_code")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlParcel {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    /**
     * Normalisierter DHL Tracking-Code
     * Format: JVGL0605379700518040 (uppercase, keine Leerzeichen)
     */
    @Column(name = "tracking_code", nullable = false, length = 50)
    private String trackingCode;

    /**
     * Lagerplatz im Shop (LEGACY - Phase 1)
     * Beispiel: "Regal B-12", "Fach 3", "Backoffice Schrank 2"
     * 
     * KOMPATIBILITÄT:
     * - Phase 1 Parcels: shelfLocation gefüllt, shelfSlotId = null
     * - Phase 2 Parcels: shelfLocation = slot.code, shelfSlotId gesetzt
     * - Beide Felder parallel für Übergang
     */
    @Column(name = "shelf_location", nullable = false, length = 100)
    private String shelfLocation;

    /**
     * Strukturierter Lagerplatz (Phase 2)
     * 
     * Optional: Kann null sein für Phase 1 Parcels
     * Phase 2: Relation zu DhlShelfSlot
     * 
     * Wenn gesetzt: shelfLocation wird automatisch auf slot.code gesetzt
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shelf_slot_id")
    private DhlShelfSlot shelfSlot;

    /**
     * Zeitpunkt der Einlagerung
     */
    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt;

    /**
     * Zeitpunkt der Abholung (null = noch nicht abgeholt)
     */
    @Column(name = "picked_up_at")
    private LocalDateTime pickedUpAt;

    /**
     * Status des Pakets
     * STORED = eingelagert, wartet auf Abholung
     * PICKED_UP = abgeholt
     * CANCELLED = storniert (Phase 3A.4)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DhlParcelStatus status = DhlParcelStatus.STORED;
    
    /**
     * Zeitpunkt der Stornierung (Phase 3A.4 - Paket-Korrektur)
     * NULL = nicht storniert
     */
    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
    
    /**
     * Stornierungsgrund (Phase 3A.4)
     * Enum CancellationReason als String
     * NULL = nicht storniert
     */
    @Column(name = "cancellation_reason", length = 50)
    private String cancellationReason;
    
    /**
     * Optionale Notiz zur Stornierung (Phase 3A.4)
     * NULL = keine Notiz oder nicht storniert
     */
    @Column(name = "cancellation_note", length = 500)
    private String cancellationNote;
    
    /**
     * User ID des Mitarbeiters, der storniert hat (Phase 3A.4)
     * NULL = nicht storniert
     */
    @Column(name = "cancelled_by_user_id")
    private Long cancelledByUserId;
    
    /**
     * E-Mail-Snapshot des Mitarbeiters, der storniert hat (Phase 3A.4)
     * NULL = nicht storniert
     */
    @Column(name = "cancelled_by_email", length = 255)
    private String cancelledByEmail;

    /**
     * Notizen (optional)
     * z.B. "Kunde angerufen", "Paket beschädigt"
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        
        if (this.receivedAt == null) {
            this.receivedAt = LocalDateTime.now();
        }
        
        if (this.status == null) {
            this.status = DhlParcelStatus.STORED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

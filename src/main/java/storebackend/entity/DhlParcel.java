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
 * - trackingCode ist pro Store NUR für aktive Pakete (STORED, PICKED_UP)
 *   eindeutig - siehe unten.
 * 
 * NORMALISIERUNG:
 * - Tracking-Codes werden vor dem Speichern normalisiert:
 *   - uppercase
 *   - Leerzeichen entfernt
 *   - führendes (J) entfernt falls vorhanden
 * 
 * WICHTIG - Tracking-Code-Eindeutigkeit ist AUSSCHLIESSLICH DB-seitig geregelt:
 * - Es gibt bewusst KEIN @UniqueConstraint/@Column(unique=true) für
 *   (store_id, tracking_code) auf Entity-Ebene mehr.
 * - Grund: Ein unconditional JPA-Unique-Constraint würde bei ddl-auto:update
 *   erneut einen globalen, unconditional Unique Constraint in der DB anlegen
 *   und damit den in V017 bewusst eingeführten PARTIAL Unique Index
 *   "idx_dhl_parcels_active_tracking" (nur WHERE status IN ('STORED',
 *   'PICKED_UP')) faktisch aushebeln (siehe V020-Migration: genau das ist in
 *   Production passiert und hat die Wiederverwendung von Tracking-Codes nach
 *   CANCELLED mit "duplicate key" Fehlern blockiert).
 * - Die tatsächliche Unique-Regel (nur aktive Pakete blockieren, CANCELLED
 *   Pakete geben den Tracking-Code frei) lebt daher ausschließlich in der
 *   SQL-Migration (V017 legt idx_dhl_parcels_active_tracking an, V020 räumt
 *   den fälschlich wiederhergestellten unconditional Constraint auf).
 */
@Entity
@Table(
    name = "dhl_parcels",
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

    // ════════════════════════════════════════════════════════════════════
    // DHL TRACKING METADATEN
    //
    // Werden AUSSCHLIESSLICH aus der authoritativen Backend-seitigen DHL
    // Tracking-Validierung (DhlTrackingClient.validateTrackingCode(), aufgerufen
    // in DhlController.storeParcel() VOR der Persistierung) übernommen - NIEMALS
    // aus vom Client mitgesendeten Werten. Alle Felder sind nullable, da:
    // - ältere Pakete (vor dieser Erweiterung) keine Metadaten haben
    // - nicht jede DHL-Response jedes Feld enthält
    // ════════════════════════════════════════════════════════════════════

    /**
     * DHL Piece Identifier (ohne führende Nullen, z.B. "340434664988418341").
     * trackingCode selbst enthält bereits den canonical pieceCode (mit Nullen).
     */
    @Column(name = "piece_identifier", length = 50)
    private String pieceIdentifier;

    /**
     * Sendungsstatus im Klartext (z.B. "Vsl. am nächsten Werktag in Filiale abholbereit")
     */
    @Column(name = "shipment_status", length = 255)
    private String shipmentStatus;

    /**
     * DHL Standard Event Code (z.B. "ZF")
     */
    @Column(name = "standard_event_code", length = 20)
    private String standardEventCode;

    /**
     * DHL Produktcode (z.B. "P")
     */
    @Column(name = "product_code", length = 20)
    private String productCode;

    /**
     * DHL Produktname (z.B. "DHL PAKET, Filial-Routing, GoGreen Plus")
     */
    @Column(name = "product_name", length = 255)
    private String productName;

    /**
     * Gewicht in kg (z.B. 1.76)
     */
    @Column(name = "weight_kg", precision = 10, scale = 3)
    private java.math.BigDecimal weightKg;

    /**
     * Zielland der Sendung (z.B. "DE")
     */
    @Column(name = "destination_country", length = 10)
    private String destinationCountry;

    /**
     * Ursprungsland der Sendung (z.B. "DE")
     */
    @Column(name = "origin_country", length = 10)
    private String originCountry;

    /**
     * Zeitpunkt des letzten DHL-Ereignisses (roher DHL-Wert, unverändert
     * durchgereicht - Format wird bislang nicht fest vorausgesetzt)
     */
    @Column(name = "last_event_timestamp", length = 50)
    private String lastEventTimestamp;

    /**
     * PSLZ-Nummer (Post-Sortier-Leitzahl, DHL-internes Feld)
     */
    @Column(name = "pslz_number", length = 50)
    private String pslzNumber;

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

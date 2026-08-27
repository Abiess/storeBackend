package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.DhlActivityAction;

import java.time.LocalDateTime;

/**
 * DHL Activity Log Entity
 * 
 * Protokolliert alle relevanten Aktionen im DHL-Paket-Management
 * 
 * MULTI-TENANT SECURITY:
 * - Jeder Eintrag ist einem Store zugeordnet (storeId)
 * - User-Identität wird IMMER aus Spring Security Context extrahiert (NIE vom Frontend)
 * - Alle Queries MÜSSEN storeId in WHERE-Bedingung haben
 * 
 * PERFORMANCE:
 * - Asynchrone Protokollierung wo möglich
 * - Keine Blockierung der Hauptoperationen (STORED, FOUND, PICKED_UP)
 * - Indizes auf storeId, action, userId, createdAt
 * 
 * Phase 3A.2 - Audit Log
 */
@Entity
@Table(
    name = "dhl_activity_log",
    indexes = {
        @Index(name = "idx_dhl_activity_store", columnList = "store_id"),
        @Index(name = "idx_dhl_activity_store_created", columnList = "store_id, created_at"),
        @Index(name = "idx_dhl_activity_action", columnList = "store_id, action"),
        @Index(name = "idx_dhl_activity_user", columnList = "store_id, user_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DhlActivityLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Store ID (Multi-Tenant)
     * WICHTIG: Immer in WHERE-Bedingung verwenden!
     */
    @Column(name = "store_id", nullable = false)
    private Long storeId;

    /**
     * Paket ID (Optional)
     * Bei STORED, FOUND, PICKED_UP: Referenz auf DhlParcel
     * Bei SCAN_FAILED, MANUAL_SEARCH: Kann null sein
     */
    @Column(name = "parcel_id")
    private Long parcelId;

    /**
     * Normalisierter Tracking-Code
     * Format: JVGL0605379700518040 (uppercase, keine Leerzeichen)
     * 
     * Wird auch bei fehlgeschlagenen Aktionen gespeichert
     */
    @Column(name = "tracking_code", nullable = false, length = 50)
    private String trackingCode;

    /**
     * Aktion
     * STORED, FOUND, PICKED_UP, SCAN_FAILED, MANUAL_SEARCH
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 20)
    private DhlActivityAction action;

    /**
     * Lagerplatz-Snapshot (Optional)
     * 
     * Bei STORED: Lagerplatz wo eingelagert wurde (z.B. "A3", "Regal B-12")
     * Bei FOUND/PICKED_UP: Lagerplatz wo gefunden/abgeholt wurde
     * Bei SCAN_FAILED/MANUAL_SEARCH: null oder letzter bekannter Platz
     */
    @Column(name = "slot_snapshot", length = 100)
    private String slotSnapshot;

    /**
     * User ID (aus Spring Security Context)
     * 
     * SECURITY: NIE vom Frontend akzeptieren!
     * Wird aus @AuthenticationPrincipal User extrahiert
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * User E-Mail Snapshot (zur Anzeige)
     * 
     * Snapshot zum Zeitpunkt der Aktion
     * Falls User später gelöscht wird, bleibt E-Mail erhalten
     */
    @Column(name = "user_email", nullable = false, length = 255)
    private String userEmail;

    /**
     * Bearbeitungsdauer in Millisekunden (Optional)
     * 
     * Bei STORED: Zeit von Scan bis Einlagerung
     * Bei FOUND: Zeit von Suchanfrage bis Ergebnis
     * Bei PICKED_UP: Zeit von Scan bis Abhol-Bestätigung
     * Bei SCAN_FAILED/MANUAL_SEARCH: null
     */
    @Column(name = "duration_ms")
    private Long durationMs;

    /**
     * Zeitstempel der Aktion
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    /**
     * Fehlergrund bei fehlgeschlagenen Aktionen (Phase 3A.3)
     * Beispiel: "PARCEL_ALREADY_PICKED_UP", "SLOT_FULL", etc.
     * NULL bei erfolgreichen Aktionen
     */
    @Column(name = "failure_reason", length = 50)
    private String failureReason;
    
    /**
     * Stornierungsgrund bei STORAGE_CANCELLED (Phase 3A.4)
     * 
     * Enum CancellationReason als String:
     * - WRONG_SCAN
     * - WRONG_PARCEL
     * - TEST_SCAN
     * - DUPLICATE_ENTRY
     * - OTHER
     * 
     * NULL bei allen anderen Actions
     */
    @Column(name = "cancellation_reason", length = 50)
    private String cancellationReason;
    
    /**
     * Optionale Notiz bei STORAGE_CANCELLED (Phase 3A.4)
     * 
     * Freitext-Begründung des Mitarbeiters
     * NULL bei allen anderen Actions oder wenn keine Notiz angegeben
     */
    @Column(name = "cancellation_note", length = 500)
    private String cancellationNote;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}

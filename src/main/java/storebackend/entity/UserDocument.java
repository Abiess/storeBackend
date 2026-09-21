package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DOCUMENTS-App (Phase 1, persönlicher Dokumenten-Tresor - GLOBAL-Scope, siehe
 * {@code storebackend.enums.AppKey#DOCUMENTS}).
 *
 * WICHTIG - bewusste Design-Entscheidungen (siehe ARCHITECTURE_APP_FACTORY.md):
 * <ul>
 *   <li>PERSONAL FIRST: ausschließlich {@link #owner}-gebunden, KEIN {@code storeId},
 *       KEINE StoreRole-Abhängigkeit, KEIN Business-/Store-Kontext in Version 1.
 *       Das Modell ist aber additiv erweiterbar (z.B. optionales {@code store}-Feld
 *       für eine spätere BUSINESS/CONTEXT-Variante), ohne V1 neu bauen zu müssen.</li>
 *   <li>Ein Dokument darf OHNE Datei existieren (rein manuell angelegt) - deshalb
 *       sind {@link #objectKey}, {@link #originalFilename}, {@link #mimeType} und
 *       {@link #size} bewusst nullable.</li>
 *   <li>Dateien liegen NIE öffentlich: Upload/Download läuft ausschließlich über
 *       {@code storebackend.service.MinioService#uploadToPrivateBucket}/
 *       {@code #getFileFromPrivateBucket} (privater Bucket, wie bei
 *       {@link SupplierInvoiceDocument}), niemals über den öffentlichen Bucket.</li>
 *   <li>{@link #extractedText} ist ein reiner Extension-Point für spätere OCR/AI-
 *       Funktionen (siehe Auftrag) - MVP füllt dieses Feld nicht.</li>
 * </ul>
 */
@Entity
@Table(name = "user_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Owner = alleiniger Rechteinhaber (Version 1: PERSONAL, kein Store-Bezug). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @Column(name = "title", nullable = false)
    private String title;

    /**
     * Freitext-Kategorie (bewusst KEIN Enum): Beispiele laut Auftrag sind
     * Versicherung, Vertrag, Rechnung, Garantie, Fahrzeug, Wohnung, Arbeit,
     * Ausweis/Dokument, Sonstiges - das Frontend schlägt diese Werte vor,
     * das Backend erzwingt keine geschlossene Liste (MVP, kein DMS).
     */
    @Column(name = "category")
    private String category;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    /** Optionales fachliches Dokumentdatum (z.B. Rechnungsdatum). */
    @Column(name = "document_date")
    private LocalDate documentDate;

    /** Optionales Ablaufdatum (z.B. Versicherung/Vertrag/Ausweis). */
    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    /** MinIO objectName im PRIVATEN Bucket. NULL wenn rein manuell ohne Datei angelegt. */
    @Column(name = "object_key")
    private String objectKey;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "file_size")
    private Long size;

    /**
     * Extension-Point für spätere OCR/AI-Funktionen (Volltext-Suche,
     * automatische Kategorisierung, Versicherungsnummer-/Ablaufdatum-
     * Erkennung). MVP lässt dieses Feld leer.
     */
    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

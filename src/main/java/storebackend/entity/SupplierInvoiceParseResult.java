package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import storebackend.enums.InvoiceDocumentType;
import storebackend.enums.InvoiceParseStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Ergebnis der Rechnungsanalyse (Phase 2A: Nur lokale PDFBox-Extraktion).
 * 
 * Speichert:
 * - Rohtext (extrahiert mit PDFBox)
 * - Erkannte Basisfelder (JSON)
 * - Extraktionsmethode und Status
 * - KEINE externen AI-Services
 */
@Entity
@Table(name = "supplier_invoice_parse_result")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SupplierInvoiceParseResult {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * Verknüpfung zum Original-Dokument (1:1).
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false, unique = true)
    private SupplierInvoiceDocument document;
    
    /**
     * Store-ID für Cross-Store-Zugriffsprüfung.
     */
    @Column(name = "store_id", nullable = false)
    private Long storeId;
    
    /**
     * Verwendete Extraktionsmethode (immer "PDFBOX" in Phase 2A).
     */
    @Column(name = "extraction_method", nullable = false, length = 50)
    private String extractionMethod = "PDFBOX";
    
    /**
     * Parser-Version für spätere Migrations/Upgrades.
     */
    @Column(name = "parser_version", nullable = false, length = 20)
    private String parserVersion = "1.0.0";
    
    /**
     * Erkannter Dokumenttyp.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 20)
    private InvoiceDocumentType documentType = InvoiceDocumentType.UNKNOWN;
    
    /**
     * Status der Textextraktion.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "parse_status", nullable = false, length = 20)
    private InvoiceParseStatus parseStatus = InvoiceParseStatus.NOT_STARTED;
    
    /**
     * Extrahierter Rohtext (vollständig, alle Seiten).
     */
    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;
    
    /**
     * Anzahl extrahierter nicht-leerer Zeilen.
     */
    @Column(name = "extracted_lines_count")
    private Integer extractedLinesCount;
    
    /**
     * Anzahl extrahierter Zeichen (ohne Whitespace).
     */
    @Column(name = "extracted_chars_count")
    private Integer extractedCharsCount;
    
    /**
     * Erkannte strukturierte Felder als JSON.
     * 
     * Beispiel:
     * {
     *   "invoiceNumber": {"value": "2026/00442", "source": "Rechnung Nr. 2026/00442"},
     *   "invoiceDate": {"value": "2026-05-08", "source": "Rechnungsdatum 08.05.2026"},
     *   "totalAmount": {"value": "1693.81", "source": "Gesamtbetrag 1.693,81 EUR"}
     * }
     */
    @Column(name = "structured_data_json", columnDefinition = "TEXT")
    private String structuredDataJson;
    
    /**
     * Manuell korrigierte Felder (Phase 2 später).
     * Wird separat von structuredDataJson gespeichert.
     */
    @Column(name = "corrected_data_json", columnDefinition = "TEXT")
    private String correctedDataJson;
    
    /**
     * Zeitpunkt des Analyse-Starts.
     */
    @Column(name = "started_at")
    private LocalDateTime startedAt;
    
    /**
     * Zeitpunkt des Analyse-Abschlusses (Erfolg oder Fehler).
     */
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    /**
     * Fehlermeldung bei FAILED-Status.
     */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    // ============ Cache-System Felder (ab V007) ============
    
    /**
     * SHA-256 Checksumme des Dokuments für Cache-Invalidierung.
     */
    @Column(name = "document_checksum", length = 64)
    private String documentChecksum;
    
    /**
     * Zeitpunkt des erfolgreichen Parsings (für Cache-Alter).
     */
    @Column(name = "parsed_at")
    private LocalDateTime parsedAt;
    
    // ============ OCR-Metadaten ============
    
    /**
     * Anzahl Seiten (aus OCR-Engine).
     */
    @Column(name = "page_count")
    private Integer pageCount;
    
    /**
     * OCR-Dauer in Millisekunden.
     */
    @Column(name = "duration_ms")
    private Long durationMs;
    
    /**
     * Verwendete OCR-Engine (z.B. "TESSERACT", "PDFBOX").
     */
    @Column(name = "ocr_engine", length = 50)
    private String ocrEngine;
    
    /**
     * Erkannte/verwendete Sprachen (kommagetrennt, z.B. "deu,eng").
     */
    @Column(name = "ocr_languages", length = 200)
    private String ocrLanguages;
    
    // ============ Strukturierte Rechnungsfelder ============
    
    @Column(name = "supplier_name", length = 500)
    private String supplierName;
    
    /**
     * Source of supplier_name: PARSER, LEARNED_CORRECTION, USER_EDITED
     */
    @Column(name = "supplier_name_source", length = 50)
    private String supplierNameSource;
    
    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;
    
    @Column(name = "customer_number", length = 100)
    private String customerNumber;
    
    @Column(name = "invoice_date")
    private LocalDate invoiceDate;
    
    @Column(name = "delivery_date")
    private LocalDate deliveryDate;
    
    @Column(name = "net_amount", precision = 19, scale = 2)
    private BigDecimal netAmount;
    
    @Column(name = "tax_amount", precision = 19, scale = 2)
    private BigDecimal taxAmount;
    
    @Column(name = "gross_amount", precision = 19, scale = 2)
    private BigDecimal grossAmount;
    
    @Column(name = "currency", length = 3)
    private String currency;
    
    // ============ Confidence und Warnungen ============
    
    /**
     * Confidence-Werte pro Feld (0.0-1.0) als JSONB.
     * Beispiel: {"supplierName": 0.9, "invoiceNumber": 1.0}
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "confidence_json", columnDefinition = "jsonb")
    private Map<String, Double> confidenceJson;
    
    /**
     * Warnungen aus der Analyse als JSONB.
     * Beispiel: ["Gesamtbetrag passt nicht zur Berechnung", "Lieferant unsicher"]
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "warnings_json", columnDefinition = "jsonb")
    private List<String> warningsJson;
    
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

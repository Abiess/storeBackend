package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Phase 4A: Preview-Response für Rechnungsimport.
 * Zeigt was importiert werden würde OHNE Daten zu ändern.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierInvoiceImportPreviewResponse {
    
    private Long documentId;
    private String supplierName;
    private String invoiceNumber;
    
    /** Neue Produkte (brauchen Kategorie + Verkaufspreis) */
    @Builder.Default
    private List<ProductToCreate> newProducts = new ArrayList<>();
    
    /** Bestehende Produkte (Bestandsupdate) */
    @Builder.Default
    private List<ProductToUpdate> existingProducts = new ArrayList<>();
    
    /** Positionen die User-Entscheidung brauchen (nicht geprüft, kein Mapping) */
    @Builder.Default
    private List<LineNeedsDecision> needsDecision = new ArrayList<>();
    
    /** Übersprungene Positionen (bereits importiert, Fehler) */
    @Builder.Default
    private List<LineSkipped> skippedLines = new ArrayList<>();
    
    /** Zusammenfassung */
    private ImportSummary summary;
}

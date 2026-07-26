package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 4A: Bestehendes Produkt wird aktualisiert.
 * Bestand wird erhöht, optional Einkaufspreis aktualisiert.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductToUpdate {
    
    private Long lineId;
    private String supplierArticleNumber;
    private String invoiceDescription;
    
    /** Gematchtes Produkt */
    private Long productId;
    private String productTitle;
    
    /** Grund des Match: LEARNED_MAPPING | USER_ASSIGNED | SKU_MATCH */
    private String matchReason;
    
    /** Bestandsänderung */
    private Integer currentStock;
    private Integer quantityToAdd;
    private Integer newStock;
    
    /** Einkaufspreis (falls Product-Feld vorhanden) */
    private BigDecimal currentPurchasePrice;
    private BigDecimal invoicePurchasePrice;
    
    /** Kann direkt importiert werden */
    private boolean canImport;
    
    /** Warnings (z.B. STOCK_QUANTITY_CONFIRMATION_REQUIRED) */
    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}

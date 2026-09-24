package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Phase 4A: Neues Produkt das angelegt werden muss.
 * User muss Kategorie + Verkaufspreis ergänzen.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductToCreate {
    
    private Long lineId;
    private String supplierArticleNumber;
    private String suggestedTitle;
    private String description;
    private BigDecimal purchasePrice;
    private BigDecimal taxRate;
    private String unit;
    private BigDecimal packagingUnit;
    
    /** Berechnet: quantity × packagingUnit (oder null wenn nicht automatisch berechenbar) */
    private Integer quantityToAdd;
    
    /** Was muss User ergänzen? ["CATEGORY", "SELLING_PRICE"] */
    @Builder.Default
    private List<String> requiredInputs = new ArrayList<>();
    
    /** Kann importiert werden wenn User Pflichtfelder ergänzt hat */
    private boolean canImport;
    
    /** Warning-Codes (z.B. STOCK_QUANTITY_CONFIRMATION_REQUIRED) */
    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}

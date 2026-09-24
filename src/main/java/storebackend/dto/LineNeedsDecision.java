package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Phase 4A: Position braucht User-Entscheidung.
 * Nicht geprüft oder kein Produkt-Mapping vorhanden.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineNeedsDecision {
    
    private Long lineId;
    private String supplierArticleNumber;
    private String description;
    
    /** Grund: LINE_NOT_REVIEWED | PRODUCT_MAPPING_MISSING */
    private String reason;
    private String reasonMessage;
}

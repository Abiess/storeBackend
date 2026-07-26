package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Phase 4A: Übersprungene Position.
 * Bereits importiert oder Fehler.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineSkipped {
    
    private Long lineId;
    private String supplierArticleNumber;
    private String description;
    
    /** Grund: ALREADY_IMPORTED | PRODUCT_NOT_FOUND */
    private String reason;
    private String reasonMessage;
    
    /** Wenn bereits importiert: wann? */
    private LocalDateTime importedAt;
}

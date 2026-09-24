package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response: Preview (vor Import)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WooCommercePreviewResponse {
    
    private List<WooCommerceProductPreview> products;
    private Integer totalProducts;
    private Integer categoriesCount;    // Anzahl Categories
    private Integer alreadyImportedCount; // Wie viele schon in markt.ma?
    
    /**
     * Plan-Limit Warnung
     */
    private Integer remainingProductsAllowed;
    private String planLimitMessage;
    
    /**
     * Varianten-Limit Warnung
     */
    private Integer productsWithVariantWarning;
}

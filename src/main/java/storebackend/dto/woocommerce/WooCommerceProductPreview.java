package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Preview: WooCommerce Product (vor Import)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WooCommerceProductPreview {
    
    private Long wooCommerceId;         // WooCommerce Product ID
    private String name;
    private String sku;
    private String price;               // String weil WC API gibt String zurück
    private String imageUrl;
    private List<String> categoryNames; // Category Names
    private Integer stockQuantity;
    private String status;              // publish | draft | pending
    
    /**
     * Existiert bereits in markt.ma? (via SKU/External ID Check)
     */
    private boolean alreadyImported;    // boolean (nicht Boolean!)
    
    /**
     * Anzahl Varianten (für Varianten-Limit-Warnung)
     */
    private Integer variationCount;
    
    /**
     * Warnung: > 3 Varianten-Attribute (markt.ma Limit)
     */
    private boolean hasVariantLimitWarning; // boolean (nicht Boolean!)
    
    /**
     * Warum wurde es geskippt? (null wenn importierbar)
     */
    private String skipReason;
}

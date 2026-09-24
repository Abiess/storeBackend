package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response: Test Connection Result
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WooCommerceTestResponse {
    
    private Boolean success;
    private String messageKey;        // i18n key (z.B. "woocommerce.test.success")
    private String detail;            // Optional: Technische Details
    
    // WooCommerce System Info
    private String wcVersion;         // WooCommerce Version
    private String wpVersion;         // WordPress Version
    private Integer productCount;
    private Integer categoryCount;
}

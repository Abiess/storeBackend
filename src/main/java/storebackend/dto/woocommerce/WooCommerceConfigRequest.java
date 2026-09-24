package storebackend.dto.woocommerce;

import lombok.Data;

/**
 * Request: WooCommerce Config speichern
 */
@Data
public class WooCommerceConfigRequest {
    
    private String shopUrl;           // https://example.com
    private String consumerKey;       // ck_...
    private String consumerSecret;    // cs_... (optional wenn Update ohne Secret-Änderung)
    private boolean enabled;          // boolean (nicht Boolean!)
    
    /**
     * Wenn true und consumerSecret leer/null ist:
     * Bestehenden Secret behalten (Update ohne Secret-Änderung)
     */
    private boolean keepExistingSecret = false;
}

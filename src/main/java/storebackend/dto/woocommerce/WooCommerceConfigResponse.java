package storebackend.dto.woocommerce;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response: WooCommerce Config (Secret maskiert!)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WooCommerceConfigResponse {
    
    private Long id;
    private String shopUrl;
    private String consumerKey;
    
    /**
     * SECURITY: Consumer Secret NIEMALS zurückgeben!
     * Nur Flag ob Secret konfiguriert ist
     */
    private Boolean consumerSecretConfigured;
    
    private Boolean enabled;
    private Boolean connected;        // Test Connection OK?
    private String wcVersion;         // WooCommerce Version
    private LocalDateTime lastTestSuccessAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

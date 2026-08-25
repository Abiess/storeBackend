package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * POS Order Item Request
 * 
 * Enthält nur productId + quantity.
 * Preis wird serverseitig aus Product.basePrice geladen (Security!)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PosOrderItemRequest {
    private Long productId;
    private Integer quantity;
    
    // Validation
    public boolean isValid() {
        return productId != null && 
               quantity != null && 
               quantity > 0 && 
               quantity <= 9999; // sinnvolle Obergrenze
    }
}

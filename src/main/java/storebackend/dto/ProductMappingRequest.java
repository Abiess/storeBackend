package storebackend.dto;

import lombok.Data;

/**
 * Phase 3B-1B: Request to map a line to a product.
 */
@Data
public class ProductMappingRequest {
    private Long productId;
    private Boolean rememberForFuture;
}

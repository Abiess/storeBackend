package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantCreateRequest {
    private String sku;
    private BigDecimal price;
    private Integer stockQuantity;
    private Map<String, String> attributes; // z.B. {"Farbe": "Rot", "Größe": "M"}
}


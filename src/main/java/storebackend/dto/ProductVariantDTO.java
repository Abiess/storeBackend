package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantDTO {
    private Long id;
    private Long productId;
    private String sku;
    private String barcode;
    private BigDecimal price;
    private BigDecimal comparePrice;
    private BigDecimal costPrice;
    private Integer stockQuantity;
    private Integer quantity;
    private BigDecimal weight;
    private String option1;
    private String option2;
    private String option3;
    private String imageUrl;
    private Boolean isActive;
    private String attributesJson;
    private Map<String, String> attributes; // Parsed JSON für UI (z.B. {"color":"rot","size":"M"})
    private List<String> images; // Mehrere Bilder für die Variante (Frontend-only)
}


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
    private BigDecimal price;
    private Integer stockQuantity;
    private String attributesJson;
    private Map<String, String> attributes; // Parsed JSON für UI (z.B. {"color":"rot","size":"M"})
    private String imageUrl; // Haupt-Bild der Variante
    private List<String> images; // Mehrere Bilder für die Variante
}


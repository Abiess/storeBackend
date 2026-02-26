package storebackend.dto;

import lombok.Data;
import storebackend.enums.ProductStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ProductDTO {
    private Long id;
    private String title;
    private String sku;
    private String description;
    private BigDecimal basePrice;
    private ProductStatus status;
    private Long categoryId;
    private String categoryName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Featured/Top Product Informationen
    private Boolean isFeatured;
    private Integer featuredOrder;
    private Long viewCount;
    private Long salesCount;

    // Bilder-Informationen
    private List<ProductMediaDTO> media;
    private String primaryImageUrl;

    // Varianten
    private List<ProductVariantDTO> variants;

    @Data
    public static class ProductMediaDTO {
        private Long id;
        private Long mediaId;
        private String url;
        private String filename;
        private Boolean isPrimary;
        private Integer sortOrder;
    }
}

package storebackend.dto;

import lombok.Data;
import storebackend.enums.ProductStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ProductDTO {
    private Long id;
    private String title;
    private String description;
    private BigDecimal basePrice;
    private ProductStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}


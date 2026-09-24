package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavedCartItemDTO {
    private Long id;
    private Long savedCartId;
    private Long productId;
    private Long variantId;
    private Integer quantity;
    private BigDecimal priceSnapshot;
    private String productSnapshot;
    private LocalDateTime createdAt;
    private String productTitle;
    private String productImageUrl;
}


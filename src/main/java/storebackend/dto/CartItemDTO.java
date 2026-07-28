package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartItemDTO {
    private Long productId;
    private String productName;
    private Long priceCents;
    private Integer quantity;
    private List<Long> categoryIds = new ArrayList<>();
    private List<Long> collectionIds = new ArrayList<>();
    
    // ✅ Staffelpreis-Metadaten für Frontend-Anzeige
    private BigDecimal baseUnitPrice;
    private BigDecimal effectiveUnitPrice;
    private Boolean tierPriceApplied;
    private Integer appliedTierMinimumQuantity;
}


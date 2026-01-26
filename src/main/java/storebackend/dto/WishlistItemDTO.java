package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.WishlistPriority;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WishlistItemDTO {
    private Long id;
    private Long wishlistId;
    private Long productId;
    private Long variantId;
    private WishlistPriority priority;
    private String note;
    private LocalDateTime addedAt;
    private String productTitle;
    private String productImageUrl;
    private Double productPrice;
    private Boolean inStock;
}


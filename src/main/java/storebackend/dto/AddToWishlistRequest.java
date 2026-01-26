package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.WishlistPriority;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddToWishlistRequest {
    private Long wishlistId;
    private Long productId;
    private Long variantId;
    private WishlistPriority priority;
    private String note;
}


package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WishlistDTO {
    private Long id;
    private Long storeId;
    private Long customerId;
    private String name;
    private String description;
    private Boolean isDefault;
    private Boolean isPublic;
    private String shareToken;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<WishlistItemDTO> items;
    private Integer itemCount;
}


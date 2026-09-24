package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavedCartDTO {
    private Long id;
    private Long storeId;
    private Long customerId;
    private String name;
    private String description;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SavedCartItemDTO> items;
    private Integer itemCount;
    private BigDecimal totalAmount;
    private Boolean isExpired;
}


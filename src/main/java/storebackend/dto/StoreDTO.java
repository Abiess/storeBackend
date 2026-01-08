package storebackend.dto;

import lombok.Data;
import storebackend.enums.StoreStatus;

import java.time.LocalDateTime;

@Data
public class StoreDTO {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private StoreStatus status;
    private LocalDateTime createdAt;
}

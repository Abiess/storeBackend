package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateSavedCartRequest {
    private Long storeId;
    private String name;
    private String description;
    private LocalDateTime expiresAt;
}

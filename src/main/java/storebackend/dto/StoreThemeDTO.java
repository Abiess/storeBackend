package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreThemeDTO {
    private Long id;
    private Long storeId;
    private String name;
    private String type;
    private String template;
    private String colorsJson;
    private String typographyJson;
    private String layoutJson;
    private String customCss;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}


package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateThemeRequest {
    private Long storeId;
    private String name;
    private String type;
    private String template;
    private String colorsJson;
    private String typographyJson;
    private String layoutJson;
    private String customCss;
}


package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThemeTemplateDTO {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String type;
    private String template;
    private String previewUrl;
    private String colorsJson;
    private String typographyJson;
    private String layoutJson;
    private String customCss;
    private Boolean isFree;
    private Integer sortOrder;
}


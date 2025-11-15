package storebackend.dto.seo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.StructuredDataTemplate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StructuredDataTemplateDTO {
    private Long id;
    private Long storeId;
    private StructuredDataTemplate.TemplateType type;
    private String templateJson;
    private Boolean isActive;
}


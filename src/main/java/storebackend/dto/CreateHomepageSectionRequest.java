package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateHomepageSectionRequest {
    private Long storeId;
    private String sectionType;
    private Integer sortOrder;
    private Boolean isActive = true;
    private String settings;
}


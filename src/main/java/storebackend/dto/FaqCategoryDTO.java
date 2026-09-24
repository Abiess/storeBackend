package storebackend.dto;

import lombok.Data;

import java.util.List;

@Data
public class FaqCategoryDTO {
    private Long id;
    private Long storeId;
    private String name;
    private String slug;
    private String description;
    private String icon;
    private Integer displayOrder;
    private Boolean isActive;
    private List<FaqItemDTO> items;
}


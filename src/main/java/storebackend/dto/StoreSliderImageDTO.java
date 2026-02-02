package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.SliderImageType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreSliderImageDTO {
    private Long id;
    private Long storeId;
    private Long mediaId;
    private String imageUrl;
    private SliderImageType imageType;
    private Integer displayOrder;
    private Boolean isActive;
    private String altText;
}


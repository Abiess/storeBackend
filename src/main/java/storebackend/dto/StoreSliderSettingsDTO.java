package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.SliderOverrideMode;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreSliderSettingsDTO {
    private Long id;
    private Long storeId;
    private SliderOverrideMode overrideMode;
    private Boolean autoplay;
    private Integer durationMs;
    private Integer transitionMs;
    private Boolean loopEnabled;
    private Boolean showDots;
    private Boolean showArrows;
}


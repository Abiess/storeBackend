package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StoreSliderDTO {
    private StoreSliderSettingsDTO settings;
    private List<StoreSliderImageDTO> images;
}

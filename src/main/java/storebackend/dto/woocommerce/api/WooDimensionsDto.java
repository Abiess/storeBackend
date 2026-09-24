package storebackend.dto.woocommerce.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * WooCommerce API: Dimensions DTO
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WooDimensionsDto {
    
    @JsonProperty("length")
    private String length;
    
    @JsonProperty("width")
    private String width;
    
    @JsonProperty("height")
    private String height;
}

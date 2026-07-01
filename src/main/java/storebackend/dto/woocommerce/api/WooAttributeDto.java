package storebackend.dto.woocommerce.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * WooCommerce API: Attribute DTO
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WooAttributeDto {
    
    private Long id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("option")
    private String option;
    
    @JsonProperty("visible")
    private Boolean visible;
    
    @JsonProperty("variation")
    private Boolean variation;
}

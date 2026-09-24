package storebackend.dto.woocommerce.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * WooCommerce API: Category Reference DTO (in Product)
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WooCategoryRefDto {
    
    private Long id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("slug")
    private String slug;
}

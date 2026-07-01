package storebackend.dto.woocommerce.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * WooCommerce API: Image DTO
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WooImageDto {
    
    private Long id;
    
    @JsonProperty("src")
    private String src;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("alt")
    private String alt;
}

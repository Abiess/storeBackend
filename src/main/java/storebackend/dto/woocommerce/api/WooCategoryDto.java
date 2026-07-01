package storebackend.dto.woocommerce.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * WooCommerce API: Category DTO
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WooCategoryDto {
    
    private Long id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("slug")
    private String slug;
    
    @JsonProperty("parent")
    private Long parent;              // Parent Category ID (0 = keine Parent)
    
    @JsonProperty("description")
    private String description;
    
    @JsonProperty("image")
    private WooImageDto image;
    
    @JsonProperty("count")
    private Integer count;            // Anzahl Produkte in dieser Kategorie
}

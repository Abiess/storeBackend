package storebackend.dto.woocommerce.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * WooCommerce API: Variation DTO
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WooVariationDto {
    
    private Long id;
    
    @JsonProperty("sku")
    private String sku;
    
    @JsonProperty("price")
    private String price;
    
    @JsonProperty("regular_price")
    private String regularPrice;
    
    @JsonProperty("sale_price")
    private String salePrice;
    
    @JsonProperty("stock_quantity")
    private Integer stockQuantity;
    
    @JsonProperty("manage_stock")
    private Boolean manageStock;
    
    @JsonProperty("in_stock")
    private Boolean inStock;
    
    @JsonProperty("attributes")
    private List<WooAttributeDto> attributes;
    
    @JsonProperty("image")
    private WooImageDto image;
    
    @JsonProperty("weight")
    private String weight;
    
    @JsonProperty("dimensions")
    private WooDimensionsDto dimensions;
}

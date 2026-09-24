package storebackend.dto.woocommerce.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * WooCommerce API: Product DTO
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WooProductDto {
    
    private Long id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("slug")
    private String slug;
    
    @JsonProperty("type")
    private String type;              // simple | variable | grouped | external
    
    @JsonProperty("status")
    private String status;            // publish | draft | pending
    
    @JsonProperty("sku")
    private String sku;
    
    @JsonProperty("price")
    private String price;
    
    @JsonProperty("regular_price")
    private String regularPrice;
    
    @JsonProperty("sale_price")
    private String salePrice;
    
    @JsonProperty("description")
    private String description;
    
    @JsonProperty("short_description")
    private String shortDescription;
    
    @JsonProperty("stock_quantity")
    private Integer stockQuantity;
    
    @JsonProperty("manage_stock")
    private Boolean manageStock;
    
    @JsonProperty("in_stock")
    private Boolean inStock;
    
    @JsonProperty("categories")
    private List<WooCategoryRefDto> categories;
    
    @JsonProperty("images")
    private List<WooImageDto> images;
    
    @JsonProperty("attributes")
    private List<WooAttributeDto> attributes;
    
    @JsonProperty("variations")
    private List<Long> variations;    // Variation IDs (nur bei type=variable)
    
    @JsonProperty("dimensions")
    private WooDimensionsDto dimensions;
    
    @JsonProperty("weight")
    private String weight;
}

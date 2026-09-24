package storebackend.dto.woocommerce.api;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * WooCommerce Customer DTO (API Response).
 * 
 * Dokumentation: https://woocommerce.github.io/woocommerce-rest-api-docs/#customers
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class WooCustomerDto {
    
    private Long id;
    
    @JsonProperty("email")
    private String email;
    
    @JsonProperty("first_name")
    private String firstName;
    
    @JsonProperty("last_name")
    private String lastName;
    
    @JsonProperty("username")
    private String username;
    
    @JsonProperty("orders_count")
    private Integer ordersCount;
    
    @JsonProperty("billing")
    private BillingAddress billing;
    
    @JsonProperty("shipping")
    private ShippingAddress shipping;
    
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BillingAddress {
        @JsonProperty("first_name")
        private String firstName;
        
        @JsonProperty("last_name")
        private String lastName;
        
        @JsonProperty("address_1")
        private String address1;
        
        @JsonProperty("address_2")
        private String address2;
        
        @JsonProperty("city")
        private String city;
        
        @JsonProperty("postcode")
        private String postcode;
        
        @JsonProperty("country")
        private String country;
        
        @JsonProperty("phone")
        private String phone;
    }
    
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ShippingAddress {
        @JsonProperty("first_name")
        private String firstName;
        
        @JsonProperty("last_name")
        private String lastName;
        
        @JsonProperty("address_1")
        private String address1;
        
        @JsonProperty("address_2")
        private String address2;
        
        @JsonProperty("city")
        private String city;
        
        @JsonProperty("postcode")
        private String postcode;
        
        @JsonProperty("country")
        private String country;
    }
}

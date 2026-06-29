package storebackend.dto.dhl;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DHL Shipment Request
 * API: POST /orders (+ ?validate=true für Validierung)
 */
@Data
@Builder
public class DhlShipmentRequest {
    
    @JsonProperty("profile")
    private String profile;  // "STANDARD_GRUPPENPROFIL"
    
    @JsonProperty("shipment")
    private Shipment shipment;
    
    @Data
    @Builder
    public static class Shipment {
        @JsonProperty("product")
        private String product;  // "V01PAK"
        
        @JsonProperty("billingNumber")
        private String billingNumber;  // "33333333330102"
        
        @JsonProperty("refNo")
        private String refNo;  // "MARKTMA-12345"
        
        @JsonProperty("shipDate")
        private String shipDate;  // "2026-06-30" (yyyy-MM-dd)
        
        @JsonProperty("shipper")
        private Address shipper;
        
        @JsonProperty("consignee")
        private Address consignee;
        
        @JsonProperty("details")
        private Details details;
    }
    
    @Data
    @Builder
    public static class Address {
        @JsonProperty("name1")
        private String name1;  // Vorname + Nachname oder Firmenname
        
        @JsonProperty("name2")
        private String name2;  // Optional: Abteilung/Zusatz
        
        @JsonProperty("addressStreet")
        private String addressStreet;  // Straße
        
        @JsonProperty("addressHouse")
        private String addressHouse;  // Hausnummer
        
        @JsonProperty("additionalAddressInformation1")
        private String additionalAddressInformation1;  // Optional: Adresszusatz
        
        @JsonProperty("postalCode")
        private String postalCode;
        
        @JsonProperty("city")
        private String city;
        
        @JsonProperty("country")
        private Country country;
        
        @JsonProperty("contactName")
        private String contactName;  // Optional
        
        @JsonProperty("email")
        private String email;  // Optional
        
        @JsonProperty("phone")
        private String phone;  // Optional
    }
    
    @Data
    @Builder
    public static class Country {
        @JsonProperty("countryISOCode")
        private String countryISOCode;  // "DE", "AT", etc.
    }
    
    @Data
    @Builder
    public static class Details {
        @JsonProperty("dim")
        private Dimensions dim;  // Optional: Maße
        
        @JsonProperty("weight")
        private Weight weight;
    }
    
    @Data
    @Builder
    public static class Dimensions {
        @JsonProperty("uom")
        private String uom;  // "mm" | "cm"
        
        @JsonProperty("height")
        private Integer height;
        
        @JsonProperty("length")
        private Integer length;
        
        @JsonProperty("width")
        private Integer width;
    }
    
    @Data
    @Builder
    public static class Weight {
        @JsonProperty("uom")
        private String uom;  // "g" | "kg"
        
        @JsonProperty("value")
        private Integer value;
    }
}

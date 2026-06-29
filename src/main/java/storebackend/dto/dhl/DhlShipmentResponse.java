package storebackend.dto.dhl;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * DHL Shipment Response
 * API: POST /orders
 */
@Data
public class DhlShipmentResponse {
    
    @JsonProperty("shipmentNo")
    private String shipmentNo;
    
    @JsonProperty("shipmentRefNo")
    private String shipmentRefNo;
    
    @JsonProperty("routingCode")
    private String routingCode;
    
    @JsonProperty("label")
    private Label label;
    
    @JsonProperty("uuid")
    private String uuid;
    
    @JsonProperty("validationMessages")
    private List<ValidationMessage> validationMessages;
    
    @JsonProperty("status")
    private Status status;
    
    @Data
    public static class Label {
        @JsonProperty("b64")
        private String b64;  // Base64-encoded PDF
        
        @JsonProperty("fileFormat")
        private String fileFormat;  // "PDF"
        
        @JsonProperty("printFormat")
        private String printFormat;  // "910-300-700" etc.
    }
    
    @Data
    public static class ValidationMessage {
        @JsonProperty("validationState")
        private String validationState;  // "Warning" | "Error"
        
        @JsonProperty("validationMessage")
        private String validationMessage;
        
        @JsonProperty("propertyPath")
        private String propertyPath;
    }
    
    @Data
    public static class Status {
        @JsonProperty("statusCode")
        private Integer statusCode;
        
        @JsonProperty("statusText")
        private String statusText;
        
        @JsonProperty("statusMessage")
        private String statusMessage;
        
        @JsonProperty("sstatus")
        private String sstatus;  // "success" | "failure"
    }
}

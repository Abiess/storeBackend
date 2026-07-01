package storebackend.dto.dhl;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * DHL Shipment Response
 * API: POST /orders
 * 
 * WICHTIG: DHL Response hat "items" Array, nicht direkt Felder auf Root!
 * {
 *   "status": { ... },
 *   "items": [
 *     {
 *       "shipmentNo": "...",
 *       "label": { "b64": "..." },
 *       ...
 *     }
 *   ]
 * }
 */
@Data
public class DhlShipmentResponse {
    
    @JsonProperty("status")
    private Status status;
    
    @JsonProperty("items")
    private List<ShipmentItem> items;
    
    // Helper methods for first item (meist nur 1 Shipment)
    public String getShipmentNo() {
        return items != null && !items.isEmpty() ? items.get(0).getShipmentNo() : null;
    }
    
    public String getShipmentRefNo() {
        return items != null && !items.isEmpty() ? items.get(0).getShipmentRefNo() : null;
    }
    
    public String getRoutingCode() {
        return items != null && !items.isEmpty() ? items.get(0).getRoutingCode() : null;
    }
    
    public String getUuid() {
        return items != null && !items.isEmpty() ? items.get(0).getUuid() : null;
    }
    
    public Label getLabel() {
        return items != null && !items.isEmpty() ? items.get(0).getLabel() : null;
    }
    
    public List<ValidationMessage> getValidationMessages() {
        return items != null && !items.isEmpty() ? items.get(0).getValidationMessages() : null;
    }
    
    @Data
    public static class ShipmentItem {
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
    }
    
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
        @JsonProperty("title")
        private String title;  // "OK"
        
        @JsonProperty("status")
        private Integer status;  // 200
        
        @JsonProperty("detail")
        private String detail;  // "1 of 1 shipment successfully printed."
        
        @JsonProperty("statusCode")
        private Integer statusCode;  // 200
    }
}

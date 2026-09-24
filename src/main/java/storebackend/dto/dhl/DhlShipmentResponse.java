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
 * 
 * Preview Fields: Sichere Vorschau-Daten für UI (kein label.b64, keine Secrets)
 */
@Data
public class DhlShipmentResponse {
    
    @JsonProperty("status")
    private Status status;
    
    @JsonProperty("items")
    private List<ShipmentItem> items;
    
    // === PREVIEW FIELDS (für UI Dialog, KEINE Secrets) ===
    private String orderNumber;              // Order Number
    private String consigneeName;            // Empfänger Name
    private String consigneeAddress;         // Empfänger Adresse (1 Zeile)
    private String shipperName;              // Absender Name
    private String shipperAddress;           // Absender Adresse (1 Zeile)
    private String productLabel;             // z.B. "DHL Paket National"
    private String billingNumberMasked;      // **********0101
    private String weight;                   // z.B. "2.5 kg"
    private String dimensions;               // z.B. "30x20x15 cm"
    private String environment;              // SANDBOX | PRODUCTION
    private String credentialsSource;        // SANDBOX | STORE | PLATFORM
    
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

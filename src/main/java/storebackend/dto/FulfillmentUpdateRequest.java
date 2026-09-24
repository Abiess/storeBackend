package storebackend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import storebackend.enums.FulfillmentStatus;

import java.time.LocalDateTime;

/**
 * Request DTO für Fulfillment-Updates (Reseller setzt Status, Tracking, etc.)
 */
@Schema(description = "Update fulfillment status and tracking information")
public record FulfillmentUpdateRequest(
        @Schema(description = "Fulfillment status", example = "ORDERED",
                allowableValues = {"PENDING", "ORDERED", "SHIPPED", "DELIVERED", "CANCELLED"})
        FulfillmentStatus status,

        @Schema(description = "Supplier's order ID", example = "ALI-2024-12345")
        String supplierOrderId,

        @Schema(description = "Tracking number from supplier", example = "1Z999AA10123456784")
        String trackingNumber,

        @Schema(description = "Shipping carrier", example = "DHL")
        String carrier,

        @Schema(description = "Internal fulfillment notes", example = "Ordered via Alibaba chat")
        String notes
) {
    /**
     * Validiert ob das Update gültig ist
     */
    public boolean isValid() {
        // Mindestens Status muss gesetzt sein
        return status != null;
    }

    /**
     * Prüft ob Tracking-Info vollständig ist
     */
    public boolean hasTrackingInfo() {
        return trackingNumber != null && !trackingNumber.isBlank();
    }
}


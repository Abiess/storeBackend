package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.DeliveryOptionsRequestDTO;
import storebackend.dto.DeliveryOptionsResponseDTO;
import storebackend.service.PublicDeliveryService;

/**
 * Public controller for delivery options (no authentication required)
 * Used by storefront to get available delivery methods during checkout
 */
@RestController
@RequestMapping("/api/public/stores/{storeId}/delivery")
@Tag(name = "Public Delivery", description = "Public APIs for delivery options (no auth)")
@RequiredArgsConstructor
@Slf4j
public class PublicDeliveryController {

    private final PublicDeliveryService publicDeliveryService;

    /**
     * Get available delivery options for a store and address
     *
     * Example request:
     * POST /api/public/stores/1/delivery/options
     * {
     *   "postalCode": "20095",
     *   "city": "Hamburg",
     *   "country": "Germany"
     * }
     *
     * Example response:
     * {
     *   "pickupEnabled": true,
     *   "deliveryEnabled": true,
     *   "expressEnabled": true,
     *   "currency": "EUR",
     *   "options": [
     *     {
     *       "deliveryType": "PICKUP",
     *       "deliveryMode": null,
     *       "fee": 0.00,
     *       "etaMinutes": null,
     *       "available": true,
     *       "zoneId": null,
     *       "zoneName": null,
     *       "reason": null
     *     },
     *     {
     *       "deliveryType": "DELIVERY",
     *       "deliveryMode": "STANDARD",
     *       "fee": 4.99,
     *       "etaMinutes": 180,
     *       "available": true,
     *       "zoneId": 123,
     *       "zoneName": "Hamburg City",
     *       "reason": null
     *     },
     *     {
     *       "deliveryType": "DELIVERY",
     *       "deliveryMode": "EXPRESS",
     *       "fee": 9.99,
     *       "etaMinutes": 60,
     *       "available": true,
     *       "zoneId": 123,
     *       "zoneName": "Hamburg City",
     *       "reason": null
     *     }
     *   ]
     * }
     *
     * @param storeId Store ID
     * @param request Request containing postal code, city, country
     * @return Available delivery options
     */
    @PostMapping("/options")
    @Operation(
            summary = "Get delivery options",
            description = "Get all available delivery options (pickup, standard, express) for a store and address. " +
                    "No authentication required. Used by storefront checkout."
    )
    public ResponseEntity<DeliveryOptionsResponseDTO> getDeliveryOptions(
            @PathVariable Long storeId,
            @Valid @RequestBody DeliveryOptionsRequestDTO request) {

        log.debug("📦 Public delivery options request for store {} with postal code {}",
                storeId, request.getPostalCode());

        try {
            DeliveryOptionsResponseDTO response = publicDeliveryService.getDeliveryOptions(storeId, request);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("❌ Error getting delivery options for store {}: {}", storeId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}


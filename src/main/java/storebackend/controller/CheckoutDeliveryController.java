package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.DeliveryOptionsRequest;
import storebackend.dto.DeliveryOptionsResponse;
import storebackend.service.DeliveryRoutingService;

/**
 * Public API for checkout delivery options
 */
@RestController
@RequestMapping("/api/checkout")
@Tag(name = "Checkout", description = "Public checkout APIs")
@RequiredArgsConstructor
public class CheckoutDeliveryController {

    private final DeliveryRoutingService deliveryRoutingService;

    @PostMapping("/delivery-options")
    @Operation(
        summary = "Calculate delivery options",
        description = "Calculate available delivery options for checkout (pickup/delivery, standard/express with fees and ETA)"
    )
    public ResponseEntity<DeliveryOptionsResponse> calculateDeliveryOptions(
            @Valid @RequestBody DeliveryOptionsRequest request) {

        DeliveryOptionsResponse response = deliveryRoutingService.calculateDeliveryOptions(request);
        return ResponseEntity.ok(response);
    }
}


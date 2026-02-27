package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.CJConnectionRequest;
import storebackend.dto.CJOrderRequest;
import storebackend.dto.CJOrderResponse;
import storebackend.entity.User;
import storebackend.service.CJIntegrationService;

/**
 * CJ Dropshipping API Controller
 * Proof of Concept für automatische Order Placement
 */
@RestController
@RequestMapping("/api/cj")
@RequiredArgsConstructor
@Slf4j
public class CJController {

    private final CJIntegrationService cjIntegrationService;

    /**
     * Verbinde Store mit CJ Account
     * POST /api/cj/stores/{storeId}/connect
     */
    @PostMapping("/stores/{storeId}/connect")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<ConnectionStatusResponse> connectStore(
            @PathVariable Long storeId,
            @RequestBody CJConnectionRequest request,
            @AuthenticationPrincipal User user
    ) {
        log.info("POST /api/cj/stores/{}/connect by user {}", storeId, user.getEmail());

        try {
            cjIntegrationService.connectStore(storeId, request, user);
            return ResponseEntity.ok(new ConnectionStatusResponse(true, "CJ connected successfully", null));
        } catch (Exception e) {
            log.error("Failed to connect CJ: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(new ConnectionStatusResponse(false, e.getMessage(), "CONNECTION_FAILED"));
        }
    }

    /**
     * Prüfe ob Store mit CJ verbunden ist
     * GET /api/cj/stores/{storeId}/status
     */
    @GetMapping("/stores/{storeId}/status")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<ConnectionStatusResponse> getConnectionStatus(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        log.info("GET /api/cj/stores/{}/status by user {}", storeId, user.getEmail());

        boolean connected = cjIntegrationService.isStoreConnected(storeId);
        return ResponseEntity.ok(new ConnectionStatusResponse(
                connected,
                connected ? "CJ connected" : "Not connected",
                null
        ));
    }

    /**
     * Disconnect Store von CJ
     * DELETE /api/cj/stores/{storeId}/disconnect
     */
    @DeleteMapping("/stores/{storeId}/disconnect")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<ConnectionStatusResponse> disconnectStore(
            @PathVariable Long storeId,
            @AuthenticationPrincipal User user
    ) {
        log.info("DELETE /api/cj/stores/{}/disconnect by user {}", storeId, user.getEmail());

        try {
            cjIntegrationService.disconnectStore(storeId, user);
            return ResponseEntity.ok(new ConnectionStatusResponse(true, "CJ disconnected", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new ConnectionStatusResponse(false, e.getMessage(), "DISCONNECT_FAILED"));
        }
    }

    /**
     * Bestelle Order Item bei CJ
     * POST /api/cj/order-items/{itemId}/place-order
     */
    @PostMapping("/order-items/{itemId}/place-order")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<CJOrderResponse> placeOrder(
            @PathVariable Long itemId,
            @RequestBody CJOrderRequest request,
            @AuthenticationPrincipal User user
    ) {
        log.info("POST /api/cj/order-items/{}/place-order by user {}", itemId, user.getEmail());

        // Setze itemId aus Path
        CJOrderRequest fullRequest = new CJOrderRequest(
                itemId,
                request.shippingFirstName(),
                request.shippingLastName(),
                request.shippingAddress(),
                request.shippingCity(),
                request.shippingPostalCode(),
                request.shippingCountryCode(),
                request.shippingPhone()
        );

        CJOrderResponse response = cjIntegrationService.placeOrder(fullRequest, user);

        if (response.success()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Response DTO
     */
    public record ConnectionStatusResponse(
            boolean connected,
            String message,
            String errorCode
    ) {}
}


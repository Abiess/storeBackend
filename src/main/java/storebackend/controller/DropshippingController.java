package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.DropshippingSourceDTO;
import storebackend.dto.FulfillmentUpdateRequest;
import storebackend.entity.User;
import storebackend.service.DropshippingService;

import java.math.BigDecimal;
import java.util.List;

/**
 * REST Controller für Dropshipping-Funktionen (nur ROLE_RESELLER)
 */
@RestController
@RequestMapping("/api/dropshipping")
@Tag(name = "Dropshipping", description = "Dropshipping management for resellers")
@RequiredArgsConstructor
@Slf4j
public class DropshippingController {

    private final DropshippingService dropshippingService;

    // ==================================================================================
    // SUPPLIER LINKS (pro Variant)
    // ==================================================================================

    @Operation(summary = "Save supplier link for variant", description = "Store owner can add/update supplier link")
    @PostMapping("/variants/{variantId}/source")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<DropshippingSourceDTO> saveSupplierLink(
            @Parameter(description = "Variant ID") @PathVariable Long variantId,
            @RequestBody DropshippingSourceDTO dto,
            @AuthenticationPrincipal User user) {

        log.info("POST /api/dropshipping/variants/{}/source by user {}", variantId, user.getEmail());

        try {
            DropshippingSourceDTO result = dropshippingService.saveSupplierLink(variantId, dto, user);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid supplier link data: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("Error saving supplier link: {}", e.getMessage());
            return ResponseEntity.status(403).build();
        }
    }

    @Operation(summary = "Get supplier link for variant")
    @GetMapping("/variants/{variantId}/source")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<DropshippingSourceDTO> getSupplierLink(
            @Parameter(description = "Variant ID") @PathVariable Long variantId,
            @AuthenticationPrincipal User user) {

        log.info("GET /api/dropshipping/variants/{}/source by user {}", variantId, user.getEmail());

        try {
            DropshippingSourceDTO result = dropshippingService.getSupplierLink(variantId, user);

            if (result == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            log.error("Error loading supplier link: {}", e.getMessage());
            return ResponseEntity.status(403).build();
        }
    }

    @Operation(summary = "Update supplier link for variant")
    @PutMapping("/variants/{variantId}/source")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<DropshippingSourceDTO> updateSupplierLink(
            @Parameter(description = "Variant ID") @PathVariable Long variantId,
            @RequestBody DropshippingSourceDTO dto,
            @AuthenticationPrincipal User user) {

        log.info("PUT /api/dropshipping/variants/{}/source by user {}", variantId, user.getEmail());

        // Update ist gleich wie POST (upsert)
        return saveSupplierLink(variantId, dto, user);
    }

    @Operation(summary = "Delete supplier link for variant")
    @DeleteMapping("/variants/{variantId}/source")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<Void> deleteSupplierLink(
            @Parameter(description = "Variant ID") @PathVariable Long variantId,
            @AuthenticationPrincipal User user) {

        log.info("DELETE /api/dropshipping/variants/{}/source by user {}", variantId, user.getEmail());

        try {
            dropshippingService.deleteSupplierLink(variantId, user);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.error("Error deleting supplier link: {}", e.getMessage());
            return ResponseEntity.status(403).build();
        }
    }

    // ==================================================================================
    // PRODUCT & STORE LEVEL
    // ==================================================================================

    @Operation(summary = "Get all supplier links for a product")
    @GetMapping("/products/{productId}/sources")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<List<DropshippingSourceDTO>> getSupplierLinksForProduct(
            @Parameter(description = "Product ID") @PathVariable Long productId,
            @AuthenticationPrincipal User user) {

        log.info("GET /api/dropshipping/products/{}/sources by user {}", productId, user.getEmail());

        try {
            List<DropshippingSourceDTO> result = dropshippingService.getSupplierLinksForProduct(productId, user);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            log.error("Error loading product supplier links: {}", e.getMessage());
            return ResponseEntity.status(403).build();
        }
    }

    @Operation(summary = "Get all supplier links for a store")
    @GetMapping("/stores/{storeId}/sources")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<List<DropshippingSourceDTO>> getSupplierLinksForStore(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        log.info("GET /api/dropshipping/stores/{}/sources by user {}", storeId, user.getEmail());

        try {
            List<DropshippingSourceDTO> result = dropshippingService.getSupplierLinksForStore(storeId, user);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            log.error("Error loading store supplier links: {}", e.getMessage());
            return ResponseEntity.status(403).build();
        }
    }

    // ==================================================================================
    // ORDER FULFILLMENT
    // ==================================================================================

    @Operation(summary = "Get order items with dropshipping info",
               description = "Returns order items with supplier links and fulfillment status")
    @GetMapping("/orders/{orderId}/items")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<List<DropshippingService.OrderItemWithDropshippingDTO>> getOrderItemsWithDropshipping(
            @Parameter(description = "Order ID") @PathVariable Long orderId,
            @AuthenticationPrincipal User user) {

        log.info("GET /api/dropshipping/orders/{}/items by user {}", orderId, user.getEmail());

        try {
            List<DropshippingService.OrderItemWithDropshippingDTO> result =
                dropshippingService.getOrderItemsWithDropshipping(orderId, user);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            log.error("Error loading order items with dropshipping: {}", e.getMessage());
            return ResponseEntity.status(403).build();
        }
    }

    @Operation(summary = "Update fulfillment status for order item",
               description = "Reseller can update fulfillment status, tracking number, etc.")
    @PutMapping("/order-items/{itemId}/fulfillment")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<Void> updateFulfillment(
            @Parameter(description = "Order Item ID") @PathVariable Long itemId,
            @RequestBody FulfillmentUpdateRequest request,
            @AuthenticationPrincipal User user) {

        log.info("PUT /api/dropshipping/order-items/{}/fulfillment by user {}", itemId, user.getEmail());

        try {
            dropshippingService.updateFulfillment(itemId, request, user);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            log.warn("Invalid fulfillment update: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            log.error("Error updating fulfillment: {}", e.getMessage());
            return ResponseEntity.status(403).build();
        }
    }

    // ==================================================================================
    // ANALYTICS / DASHBOARD
    // ==================================================================================

    @Operation(summary = "Calculate total margin for store",
               description = "Returns average profit margin across all dropshipping products")
    @GetMapping("/stores/{storeId}/margin")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<MarginResponse> calculateTotalMargin(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @AuthenticationPrincipal User user) {

        log.info("GET /api/dropshipping/stores/{}/margin by user {}", storeId, user.getEmail());

        try {
            BigDecimal margin = dropshippingService.calculateTotalMargin(storeId, user);
            return ResponseEntity.ok(new MarginResponse(margin));
        } catch (RuntimeException e) {
            log.error("Error calculating margin: {}", e.getMessage());
            return ResponseEntity.status(403).build();
        }
    }

    /**
     * Response DTO für Margin-Berechnung
     */
    public record MarginResponse(
            @Parameter(description = "Average profit margin (0.45 = 45%)")
            BigDecimal marginPercentage
    ) {
        public String getFormattedPercentage() {
            return String.format("%.1f%%", marginPercentage.multiply(BigDecimal.valueOf(100)).doubleValue());
        }
    }
}


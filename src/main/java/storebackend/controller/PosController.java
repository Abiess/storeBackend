package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.PosOrderRequest;
import storebackend.dto.PosOrderResponse;
import storebackend.entity.User;
import storebackend.util.StoreAccessChecker;
import storebackend.service.PosOrderService;

/**
 * POS Controller
 * 
 * REST API für Point-of-Sale (Kassensystem)
 * 
 * Endpoints:
 * - POST /api/stores/{storeId}/pos/sales → POS-Verkauf erstellen
 * 
 * SECURITY:
 * - Multi-Tenant: storeId validation
 * - RBAC: Requires ORDER_CREATE permission (oder Owner)
 * - Preise werden serverseitig validiert
 */
@RestController
@RequestMapping("/api/stores/{storeId}/pos")
@RequiredArgsConstructor
@Slf4j
public class PosController {
    private final PosOrderService posOrderService;
    private final StoreAccessChecker storeAccessChecker;

    /**
     * POST /api/stores/{storeId}/pos/sales
     * 
     * Erstellt POS-Verkauf (Order mit source = POS)
     * 
     * Request Body:
     * {
     *   "paymentMethod": "CASH" | "CARD_EXTERNAL",
     *   "cashReceived": 30.00,  // nur für CASH
     *   "items": [
     *     { "productId": 123, "quantity": 2 }
     *   ]
     * }
     * 
     * Response:
     * {
     *   "orderId": 456,
     *   "orderNumber": "POS-20260826120000-A1B2",
     *   "totalGross": 23.87,
     *   "taxTotal": 3.82,
     *   "cashChange": 6.13,  // nur für CASH
     *   "status": "CONFIRMED",
     *   "createdAt": "2026-08-26T12:00:00"
     * }
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param request POS Order Request
     * @param user Authenticated User (Custom Entity)
     * @return PosOrderResponse
     */
    @PostMapping("/sales")
    public ResponseEntity<?> createPosOrder(
        @PathVariable Long storeId,
        @RequestBody PosOrderRequest request,
        @AuthenticationPrincipal User user
    ) {
        try {
            // 1. Authentication Check
            if (user == null) {
                log.warn("POS order creation denied: User not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
            }

            // 2. RBAC Permission Check
            // POS-Verkauf = Order erstellen → ORDER_CREATE Permission
            if (!storeAccessChecker.hasPermission(storeId, "ORDER_CREATE")) {
                log.warn("POS order creation denied: user={}, store={}, missing ORDER_CREATE permission", 
                    user.getId(), storeId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: ORDER_CREATE permission required");
            }

            // 3. Request Validation
            if (!request.isValid()) {
                return ResponseEntity.badRequest()
                    .body("Invalid request: check paymentMethod and items");
            }

            // 4. POS Order erstellen
            PosOrderResponse response = posOrderService.createPosOrder(storeId, request);

            log.info("POS order created successfully: orderNumber={}, user={}, store={}", 
                response.getOrderNumber(), user.getId(), storeId);

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (SecurityException e) {
            log.error("Security violation in POS order: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("Invalid POS order request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            log.error("POS order creation failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Order creation failed: " + e.getMessage());
        }
    }
}

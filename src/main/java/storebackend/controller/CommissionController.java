package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.RevenueSplitDTO;
import storebackend.entity.Order;
import storebackend.repository.OrderRepository;
import storebackend.service.RevenueShareService;

import java.math.BigDecimal;
import java.util.List;

/**
 * REST Controller for commission and revenue split management.
 */
@RestController
@RequestMapping("/api/commissions")
@RequiredArgsConstructor
public class CommissionController {

    private final RevenueShareService revenueShareService;
    private final OrderRepository orderRepository;

    /**
     * Get revenue split breakdown for an order.
     * GET /api/commissions/orders/{orderId}/split
     */
    @GetMapping("/orders/{orderId}/split")
    @PreAuthorize("hasAnyRole('ROLE_RESELLER', 'ROLE_SUPPLIER', 'ROLE_PLATFORM_ADMIN')")
    public ResponseEntity<List<RevenueSplitDTO>> getOrderRevenueSplit(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        List<RevenueSplitDTO> split = revenueShareService.getOrderRevenueSplit(order);
        return ResponseEntity.ok(split);
    }

    /**
     * Get pending commissions for authenticated supplier.
     * GET /api/commissions/supplier/pending
     */
    @GetMapping("/supplier/pending")
    @PreAuthorize("hasRole('ROLE_SUPPLIER')")
    public ResponseEntity<BigDecimal> getSupplierPendingCommissions() {
        // TODO: Get supplier ID from authenticated user
        Long supplierId = 1L; // Placeholder
        BigDecimal pending = revenueShareService.getPendingCommissionsForSupplier(supplierId);
        return ResponseEntity.ok(pending);
    }

    /**
     * Get pending commissions for a store (reseller).
     * GET /api/commissions/stores/{storeId}/pending
     */
    @GetMapping("/stores/{storeId}/pending")
    @PreAuthorize("hasRole('ROLE_RESELLER')")
    public ResponseEntity<BigDecimal> getResellerPendingCommissions(@PathVariable Long storeId) {
        BigDecimal pending = revenueShareService.getPendingCommissionsForReseller(storeId);
        return ResponseEntity.ok(pending);
    }

    /**
     * Approve commissions for an order (admin only).
     * POST /api/commissions/orders/{orderId}/approve
     */
    @PostMapping("/orders/{orderId}/approve")
    @PreAuthorize("hasRole('ROLE_PLATFORM_ADMIN')")
    public ResponseEntity<Void> approveCommissions(@PathVariable Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        revenueShareService.approveCommissionsForOrder(order);
        return ResponseEntity.ok().build();
    }
}

package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ValidateCouponsRequest;
import storebackend.dto.ValidateCouponsResponse;
import storebackend.service.CouponService;

@RestController
@RequestMapping("/public/stores/{storeId}")
@RequiredArgsConstructor
@Slf4j
public class PublicCouponController {

    private final CouponService couponService;

    @PostMapping("/cart/validate-coupons")
    public ResponseEntity<ValidateCouponsResponse> validateCoupons(
            @PathVariable Long storeId,
            @RequestBody ValidateCouponsRequest request) {
        log.info("Validating coupons for store {}: codes={}", storeId, request.getAppliedCodes());
        ValidateCouponsResponse response = couponService.validateCoupons(storeId, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/orders/{orderId}/finalize-coupons")
    public ResponseEntity<Void> finalizeCoupons(
            @PathVariable Long storeId,
            @PathVariable Long orderId,
            @RequestBody ValidateCouponsRequest request) {
        log.info("Finalizing coupons for order {} in store {}", orderId, storeId);

        // Re-validate to get valid coupons
        ValidateCouponsResponse validation = couponService.validateCoupons(storeId, request);

        // Finalize redemptions
        couponService.finalizeRedemptions(storeId, orderId, request, validation.getValidCoupons());

        return ResponseEntity.ok().build();
    }
}
package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.*;
import storebackend.service.CouponService;

import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/coupons")
@RequiredArgsConstructor
@Slf4j
public class CouponController {

    private final CouponService couponService;

    @GetMapping
    public ResponseEntity<List<CouponDTO>> listCoupons(
            @PathVariable Long storeId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(couponService.listCoupons(storeId, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CouponDTO> getCoupon(
            @PathVariable Long storeId,
            @PathVariable Long id) {
        return ResponseEntity.ok(couponService.getCoupon(storeId, id));
    }

    @PostMapping
    public ResponseEntity<CouponDTO> createCoupon(
            @PathVariable Long storeId,
            @RequestBody CouponDTO dto) {
        return ResponseEntity.ok(couponService.createCoupon(storeId, dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CouponDTO> updateCoupon(
            @PathVariable Long storeId,
            @PathVariable Long id,
            @RequestBody CouponDTO dto) {
        return ResponseEntity.ok(couponService.updateCoupon(storeId, id, dto));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<Void> pauseCoupon(
            @PathVariable Long storeId,
            @PathVariable Long id) {
        couponService.pauseCoupon(storeId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<Void> resumeCoupon(
            @PathVariable Long storeId,
            @PathVariable Long id) {
        couponService.resumeCoupon(storeId, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/archive")
    public ResponseEntity<Void> archiveCoupon(
            @PathVariable Long storeId,
            @PathVariable Long id) {
        couponService.archiveCoupon(storeId, id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/usage")
    public ResponseEntity<CouponUsageDTO> getCouponUsage(
            @PathVariable Long storeId,
            @PathVariable Long id) {
        return ResponseEntity.ok(couponService.getCouponUsage(storeId, id));
    }

    @PostMapping("/import")
    public ResponseEntity<String> importCoupons(
            @PathVariable Long storeId,
            @RequestBody String csvContent) {
        // TODO: Implement CSV import logic
        log.info("CSV import requested for store {}", storeId);
        return ResponseEntity.ok("Import feature coming soon");
    }

    @GetMapping("/export")
    public ResponseEntity<String> exportCoupons(@PathVariable Long storeId) {
        // TODO: Implement CSV export logic
        log.info("CSV export requested for store {}", storeId);
        return ResponseEntity.ok("Export feature coming soon");
    }
}


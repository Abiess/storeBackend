package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ValidateCouponsRequest;
import storebackend.dto.ValidateCouponsResponse;
import storebackend.service.CouponService;

@RestController
@RequestMapping("/api/public/stores/{storeId}")
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

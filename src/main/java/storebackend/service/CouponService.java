package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.*;
import storebackend.entity.Coupon;
import storebackend.entity.CouponRedemption;
import storebackend.repository.CouponRepository;
import storebackend.repository.CouponRedemptionRepository;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CouponService {

    private final CouponRepository couponRepository;
    private final CouponRedemptionRepository redemptionRepository;

    @Transactional
    public CouponDTO createCoupon(Long storeId, CouponDTO dto) {
        // Validate unique code per store
        String normalized = Coupon.normalizeCode(dto.getCode());
        couponRepository.findByStoreIdAndCodeNormalized(storeId, normalized)
            .ifPresent(c -> {
                throw new IllegalArgumentException("Coupon code already exists in this store");
            });

        dto.setStoreId(storeId);
        dto.setTimesUsedTotal(0);
        Coupon coupon = dto.toEntity();
        coupon = couponRepository.save(coupon);
        log.info("Created coupon {} for store {}", coupon.getCode(), storeId);
        return CouponDTO.fromEntity(coupon);
    }

    @Transactional
    public CouponDTO updateCoupon(Long storeId, Long id, CouponDTO dto) {
        Coupon existing = couponRepository.findByStoreIdAndId(storeId, id)
            .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));

        // Check if code changed and is unique
        if (!existing.getCode().equalsIgnoreCase(dto.getCode())) {
            String normalized = Coupon.normalizeCode(dto.getCode());
            couponRepository.findByStoreIdAndCodeNormalized(storeId, normalized)
                .ifPresent(c -> {
                    if (!c.getId().equals(id)) {
                        throw new IllegalArgumentException("Coupon code already exists");
                    }
                });
        }

        dto.setId(id);
        dto.setStoreId(storeId);
        dto.setTimesUsedTotal(existing.getTimesUsedTotal());
        Coupon updated = dto.toEntity();
        updated = couponRepository.save(updated);
        log.info("Updated coupon {} for store {}", updated.getCode(), storeId);
        return CouponDTO.fromEntity(updated);
    }

    @Transactional(readOnly = true)
    public List<CouponDTO> listCoupons(Long storeId, String status) {
        List<Coupon> coupons;
        if (status != null && !status.isEmpty()) {
            coupons = couponRepository.findByStoreIdAndStatus(storeId, Coupon.CouponStatus.valueOf(status.toUpperCase()));
        } else {
            coupons = couponRepository.findAll().stream()
                .filter(c -> c.getStoreId().equals(storeId))
                .collect(Collectors.toList());
        }
        return coupons.stream().map(CouponDTO::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CouponDTO getCoupon(Long storeId, Long id) {
        Coupon coupon = couponRepository.findByStoreIdAndId(storeId, id)
            .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));
        return CouponDTO.fromEntity(coupon);
    }

    @Transactional
    public void pauseCoupon(Long storeId, Long id) {
        Coupon coupon = couponRepository.findByStoreIdAndId(storeId, id)
            .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));
        coupon.setStatus(Coupon.CouponStatus.PAUSED);
        couponRepository.save(coupon);
        log.info("Paused coupon {} for store {}", coupon.getCode(), storeId);
    }

    @Transactional
    public void resumeCoupon(Long storeId, Long id) {
        Coupon coupon = couponRepository.findByStoreIdAndId(storeId, id)
            .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));
        coupon.setStatus(Coupon.CouponStatus.ACTIVE);
        couponRepository.save(coupon);
        log.info("Resumed coupon {} for store {}", coupon.getCode(), storeId);
    }

    @Transactional
    public void archiveCoupon(Long storeId, Long id) {
        Coupon coupon = couponRepository.findByStoreIdAndId(storeId, id)
            .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));
        coupon.setStatus(Coupon.CouponStatus.ARCHIVED);
        couponRepository.save(coupon);
        log.info("Archived coupon {} for store {}", coupon.getCode(), storeId);
    }

    @Transactional(readOnly = true)
    public CouponUsageDTO getCouponUsage(Long storeId, Long couponId) {
        Coupon coupon = couponRepository.findByStoreIdAndId(storeId, couponId)
            .orElseThrow(() -> new IllegalArgumentException("Coupon not found"));

        List<CouponRedemption> redemptions = redemptionRepository.findByStoreIdAndCouponId(storeId, couponId);
        Long totalDiscount = redemptions.stream()
            .mapToLong(CouponRedemption::getAppliedCents)
            .sum();

        return new CouponUsageDTO(
            (long) redemptions.size(),
            totalDiscount,
            coupon.getCurrency(),
            coupon.getTimesUsedTotal()
        );
    }

    // ==================== VALIDATION LOGIC ====================

    @Transactional
    public ValidateCouponsResponse validateCoupons(Long storeId, ValidateCouponsRequest request) {
        ValidateCouponsResponse response = new ValidateCouponsResponse();
        List<ValidCouponDTO> validCoupons = new ArrayList<>();
        List<InvalidCouponDTO> invalidCoupons = new ArrayList<>();

        CartDTO cart = request.getCart();
        String domainHost = request.getDomainHost();
        LocalDateTime now = LocalDateTime.now();

        // Fetch all coupons by normalized codes
        Map<String, Coupon> couponMap = new HashMap<>();
        for (String code : request.getAppliedCodes()) {
            String normalized = Coupon.normalizeCode(code);
            Optional<Coupon> opt = couponRepository.findByStoreIdAndCodeNormalized(storeId, normalized);
            if (opt.isPresent()) {
                couponMap.put(code, opt.get());
            } else {
                invalidCoupons.add(new InvalidCouponDTO(code, "Coupon not found"));
            }
        }

        // Also check auto-apply coupons
        List<Coupon> autoApplyCoupons = couponRepository.findByStoreIdAndAutoApplyTrue(storeId);
        for (Coupon auto : autoApplyCoupons) {
            if (!couponMap.containsValue(auto)) {
                couponMap.put(auto.getCode(), auto);
            }
        }

        // Validate each coupon
        for (Map.Entry<String, Coupon> entry : couponMap.entrySet()) {
            Coupon coupon = entry.getValue();
            String validationError = validateCoupon(coupon, cart, domainHost, now);
            if (validationError != null) {
                invalidCoupons.add(new InvalidCouponDTO(entry.getKey(), validationError));
            } else {
                validCoupons.add(new ValidCouponDTO(
                    coupon.getId(),
                    coupon.getCode(),
                    coupon.getType().name(),
                    0L, // will be calculated below
                    ""
                ));
            }
        }

        // Check stacking rules and calculate discounts
        validCoupons = applyStackingRules(validCoupons, couponMap, cart);

        // Calculate cart totals
        long totalDiscount = validCoupons.stream().mapToLong(ValidCouponDTO::getDiscountCents).sum();
        CartTotalsDTO totals = new CartTotalsDTO();
        totals.setSubtotalCents(cart.getSubtotalCents());
        totals.setDiscountCents(totalDiscount);
        totals.setShippingCents(0L); // Add shipping logic if needed
        totals.setTaxCents(0L); // Add tax logic if needed
        totals.setTotalCents(Math.max(0, cart.getSubtotalCents() - totalDiscount));
        totals.setCurrency(cart.getCurrency());

        response.setValidCoupons(validCoupons);
        response.setInvalidCoupons(invalidCoupons);
        response.setCartTotals(totals);

        return response;
    }

    private String validateCoupon(Coupon coupon, CartDTO cart, String domainHost, LocalDateTime now) {
        // Status check
        if (coupon.getStatus() != Coupon.CouponStatus.ACTIVE) {
            return "Coupon is not active";
        }

        // Time window check
        if (coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt())) {
            return "Coupon not yet valid";
        }
        if (coupon.getEndsAt() != null && now.isAfter(coupon.getEndsAt())) {
            return "Coupon has expired";
        }

        // Currency check
        if (coupon.getCurrency() != null && !coupon.getCurrency().equalsIgnoreCase(cart.getCurrency())) {
            return "Currency mismatch";
        }

        // Min subtotal check
        if (coupon.getMinSubtotalCents() != null && cart.getSubtotalCents() < coupon.getMinSubtotalCents()) {
            return "Minimum purchase amount not met";
        }

        // Domain scope check
        if (coupon.getDomainScope() == Coupon.DomainScope.SELECTED && !coupon.getDomainIds().isEmpty()) {
            // In real implementation, resolve domainHost to domainId and check
            // For now, just log
            log.debug("Domain scope check for coupon {}: {}", coupon.getCode(), domainHost);
        }

        // Product/Category/Collection filter
        if (coupon.getAppliesTo() != Coupon.AppliesTo.ALL) {
            boolean hasMatch = false;
            for (CartItemDTO item : cart.getItems()) {
                if (coupon.getAppliesTo() == Coupon.AppliesTo.PRODUCTS && coupon.getProductIds().contains(item.getProductId())) {
                    hasMatch = true;
                    break;
                }
                if (coupon.getAppliesTo() == Coupon.AppliesTo.CATEGORIES &&
                    item.getCategoryIds().stream().anyMatch(coupon.getCategoryIds()::contains)) {
                    hasMatch = true;
                    break;
                }
                if (coupon.getAppliesTo() == Coupon.AppliesTo.COLLECTIONS &&
                    item.getCollectionIds().stream().anyMatch(coupon.getCollectionIds()::contains)) {
                    hasMatch = true;
                    break;
                }
            }
            if (!hasMatch) {
                return "No eligible items in cart";
            }
        }

        // Customer email restriction
        if (!coupon.getCustomerEmails().isEmpty() &&
            (cart.getCustomerEmail() == null || !coupon.getCustomerEmails().contains(cart.getCustomerEmail().toLowerCase()))) {
            return "Coupon not available for this customer";
        }

        // Usage limit total
        if (coupon.getUsageLimitTotal() != null && coupon.getTimesUsedTotal() >= coupon.getUsageLimitTotal()) {
            return "Coupon usage limit reached";
        }

        // Usage limit per customer
        if (coupon.getUsageLimitPerCustomer() != null && cart.getCustomerEmail() != null) {
            long usageCount = redemptionRepository.countByStoreIdAndCouponIdAndCustomerEmail(
                coupon.getStoreId(), coupon.getId(), cart.getCustomerEmail()
            );
            if (usageCount >= coupon.getUsageLimitPerCustomer()) {
                return "Customer usage limit reached";
            }
        }

        return null; // Valid
    }

    private List<ValidCouponDTO> applyStackingRules(List<ValidCouponDTO> validCoupons, Map<String, Coupon> couponMap, CartDTO cart) {
        if (validCoupons.isEmpty()) return validCoupons;

        // Group by combinable type
        List<Coupon> coupons = validCoupons.stream()
            .map(v -> couponMap.values().stream().filter(c -> c.getId().equals(v.getCouponId())).findFirst().orElse(null))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        boolean hasNonCombinable = coupons.stream().anyMatch(c -> c.getCombinable() == Coupon.Combinable.NONE);

        if (hasNonCombinable) {
            // Apply only the best coupon
            Coupon bestCoupon = findBestCoupon(coupons, cart);
            ValidCouponDTO best = validCoupons.stream()
                .filter(v -> v.getCouponId().equals(bestCoupon.getId()))
                .findFirst()
                .orElse(null);
            if (best != null) {
                best.setDiscountCents(calculateDiscount(bestCoupon, cart));
                best.setMessage("Best discount applied");
                return List.of(best);
            }
        }

        // Apply stacking rules
        List<ValidCouponDTO> result = new ArrayList<>();
        for (ValidCouponDTO valid : validCoupons) {
            Coupon coupon = coupons.stream().filter(c -> c.getId().equals(valid.getCouponId())).findFirst().orElse(null);
            if (coupon != null) {
                valid.setDiscountCents(calculateDiscount(coupon, cart));
                valid.setMessage(coupon.getType().name() + " discount");
                result.add(valid);
            }
        }

        return result;
    }

    private Coupon findBestCoupon(List<Coupon> coupons, CartDTO cart) {
        return coupons.stream()
            .max(Comparator.comparingLong(c -> calculateDiscount(c, cart)))
            .orElse(coupons.get(0));
    }

    private long calculateDiscount(Coupon coupon, CartDTO cart) {
        long eligibleAmount = calculateEligibleAmount(coupon, cart);

        switch (coupon.getType()) {
            case PERCENT:
                return eligibleAmount * coupon.getPercentDiscount() / 100;
            case FIXED:
                return Math.min(coupon.getValueCents(), eligibleAmount);
            case FREE_SHIPPING:
                return 0L; // Shipping discount handled separately
            default:
                return 0L;
        }
    }

    private long calculateEligibleAmount(Coupon coupon, CartDTO cart) {
        if (coupon.getAppliesTo() == Coupon.AppliesTo.ALL) {
            return cart.getSubtotalCents();
        }

        long eligible = 0;
        for (CartItemDTO item : cart.getItems()) {
            boolean matches = false;
            if (coupon.getAppliesTo() == Coupon.AppliesTo.PRODUCTS && coupon.getProductIds().contains(item.getProductId())) {
                matches = true;
            } else if (coupon.getAppliesTo() == Coupon.AppliesTo.CATEGORIES &&
                       item.getCategoryIds().stream().anyMatch(coupon.getCategoryIds()::contains)) {
                matches = true;
            } else if (coupon.getAppliesTo() == Coupon.AppliesTo.COLLECTIONS &&
                       item.getCollectionIds().stream().anyMatch(coupon.getCollectionIds()::contains)) {
                matches = true;
            }
            if (matches) {
                eligible += item.getPriceCents() * item.getQuantity();
            }
        }
        return eligible;
    }

    // ==================== FINALIZE REDEMPTIONS ====================

    @Transactional
    public void finalizeRedemptions(Long storeId, Long orderId, ValidateCouponsRequest request, List<ValidCouponDTO> validCoupons) {
        // Idempotency check
        if (redemptionRepository.findByOrderId(orderId).isPresent()) {
            log.warn("Redemptions already finalized for order {}", orderId);
            return;
        }

        for (ValidCouponDTO valid : validCoupons) {
            CouponRedemption redemption = new CouponRedemption();
            redemption.setStoreId(storeId);
            redemption.setCouponId(valid.getCouponId());
            redemption.setOrderId(orderId);
            redemption.setAppliedCents(valid.getDiscountCents());
            redemption.setCurrency(request.getCart().getCurrency());
            redemption.setCustomerEmail(request.getCart().getCustomerEmail());
            redemption.setDomainHost(request.getDomainHost());
            redemptionRepository.save(redemption);

            // Increment usage counter
            Coupon coupon = couponRepository.findById(valid.getCouponId()).orElse(null);
            if (coupon != null) {
                coupon.setTimesUsedTotal(coupon.getTimesUsedTotal() + 1);
                couponRepository.save(coupon);
            }
        }

        log.info("Finalized {} coupon redemptions for order {}", validCoupons.size(), orderId);
    }
}


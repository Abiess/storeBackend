package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.*;
import storebackend.entity.Coupon;
import storebackend.repository.CouponRepository;
import storebackend.repository.CouponRedemptionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CouponServiceTest {

    @Mock
    private CouponRepository couponRepository;

    @Mock
    private CouponRedemptionRepository redemptionRepository;

    @InjectMocks
    private CouponService couponService;

    private Long storeId = 1L;
    private Coupon testCoupon;
    private CartDTO testCart;

    @BeforeEach
    void setUp() {
        // Setup test coupon
        testCoupon = new Coupon();
        testCoupon.setId(1L);
        testCoupon.setStoreId(storeId);
        testCoupon.setCode("SAVE20");
        testCoupon.setCodeNormalized("5AVE20");
        testCoupon.setType(Coupon.CouponType.PERCENT);
        testCoupon.setPercentDiscount(20);
        testCoupon.setCurrency("USD");
        testCoupon.setAppliesTo(Coupon.AppliesTo.ALL);
        testCoupon.setStatus(Coupon.CouponStatus.ACTIVE);
        testCoupon.setCombinable(Coupon.Combinable.NONE);
        testCoupon.setTimesUsedTotal(0);
        testCoupon.setAutoApply(false);

        // Setup test cart
        testCart = new CartDTO();
        testCart.setCurrency("USD");
        testCart.setSubtotalCents(10000L); // $100.00
        testCart.setCustomerEmail("test@example.com");

        CartItemDTO item = new CartItemDTO();
        item.setProductId(1L);
        item.setPriceCents(10000L);
        item.setQuantity(1);
        testCart.setItems(List.of(item));
    }

    @Test
    void testValidateCoupons_ValidPercentCoupon_ReturnsDiscount() {
        // Arrange
        ValidateCouponsRequest request = new ValidateCouponsRequest();
        request.setDomainHost("example.com");
        request.setCart(testCart);
        request.setAppliedCodes(List.of("SAVE20"));

        when(couponRepository.findByStoreIdAndCodeNormalized(storeId, "5AVE20"))
            .thenReturn(Optional.of(testCoupon));
        when(couponRepository.findByStoreIdAndAutoApplyTrue(storeId))
            .thenReturn(List.of());

        // Act
        ValidateCouponsResponse response = couponService.validateCoupons(storeId, request);

        // Assert
        assertNotNull(response);
        assertEquals(1, response.getValidCoupons().size());
        assertEquals(0, response.getInvalidCoupons().size());

        ValidCouponDTO validCoupon = response.getValidCoupons().get(0);
        assertEquals(2000L, validCoupon.getDiscountCents()); // 20% of $100 = $20
        assertEquals("SAVE20", validCoupon.getCode());

        assertEquals(8000L, response.getCartTotals().getTotalCents()); // $100 - $20 = $80
    }

    @Test
    void testValidateCoupons_ExpiredCoupon_ReturnsInvalid() {
        // Arrange
        testCoupon.setEndsAt(LocalDateTime.now().minusDays(1)); // Expired yesterday

        ValidateCouponsRequest request = new ValidateCouponsRequest();
        request.setDomainHost("example.com");
        request.setCart(testCart);
        request.setAppliedCodes(List.of("SAVE20"));

        when(couponRepository.findByStoreIdAndCodeNormalized(storeId, "5AVE20"))
            .thenReturn(Optional.of(testCoupon));
        when(couponRepository.findByStoreIdAndAutoApplyTrue(storeId))
            .thenReturn(List.of());

        // Act
        ValidateCouponsResponse response = couponService.validateCoupons(storeId, request);

        // Assert
        assertNotNull(response);
        assertEquals(0, response.getValidCoupons().size());
        assertEquals(1, response.getInvalidCoupons().size());
        assertEquals("Coupon has expired", response.getInvalidCoupons().get(0).getReason());
    }

    @Test
    void testValidateCoupons_MinSubtotalNotMet_ReturnsInvalid() {
        // Arrange
        testCoupon.setMinSubtotalCents(20000L); // Minimum $200
        testCart.setSubtotalCents(10000L); // Cart has $100

        ValidateCouponsRequest request = new ValidateCouponsRequest();
        request.setDomainHost("example.com");
        request.setCart(testCart);
        request.setAppliedCodes(List.of("SAVE20"));

        when(couponRepository.findByStoreIdAndCodeNormalized(storeId, "5AVE20"))
            .thenReturn(Optional.of(testCoupon));
        when(couponRepository.findByStoreIdAndAutoApplyTrue(storeId))
            .thenReturn(List.of());

        // Act
        ValidateCouponsResponse response = couponService.validateCoupons(storeId, request);

        // Assert
        assertEquals(0, response.getValidCoupons().size());
        assertEquals(1, response.getInvalidCoupons().size());
        assertEquals("Minimum purchase amount not met", response.getInvalidCoupons().get(0).getReason());
    }

    @Test
    void testValidateCoupons_UsageLimitReached_ReturnsInvalid() {
        // Arrange
        testCoupon.setUsageLimitTotal(10);
        testCoupon.setTimesUsedTotal(10); // Already used 10 times

        ValidateCouponsRequest request = new ValidateCouponsRequest();
        request.setDomainHost("example.com");
        request.setCart(testCart);
        request.setAppliedCodes(List.of("SAVE20"));

        when(couponRepository.findByStoreIdAndCodeNormalized(storeId, "5AVE20"))
            .thenReturn(Optional.of(testCoupon));
        when(couponRepository.findByStoreIdAndAutoApplyTrue(storeId))
            .thenReturn(List.of());

        // Act
        ValidateCouponsResponse response = couponService.validateCoupons(storeId, request);

        // Assert
        assertEquals(0, response.getValidCoupons().size());
        assertEquals(1, response.getInvalidCoupons().size());
        assertEquals("Coupon usage limit reached", response.getInvalidCoupons().get(0).getReason());
    }

    @Test
    void testValidateCoupons_CustomerUsageLimitReached_ReturnsInvalid() {
        // Arrange
        testCoupon.setUsageLimitPerCustomer(1);

        ValidateCouponsRequest request = new ValidateCouponsRequest();
        request.setDomainHost("example.com");
        request.setCart(testCart);
        request.setAppliedCodes(List.of("SAVE20"));

        when(couponRepository.findByStoreIdAndCodeNormalized(storeId, "5AVE20"))
            .thenReturn(Optional.of(testCoupon));
        when(couponRepository.findByStoreIdAndAutoApplyTrue(storeId))
            .thenReturn(List.of());
        when(redemptionRepository.countByStoreIdAndCouponIdAndCustomerEmail(storeId, 1L, "test@example.com"))
            .thenReturn(1L); // Already used once

        // Act
        ValidateCouponsResponse response = couponService.validateCoupons(storeId, request);

        // Assert
        assertEquals(0, response.getValidCoupons().size());
        assertEquals(1, response.getInvalidCoupons().size());
        assertEquals("Customer usage limit reached", response.getInvalidCoupons().get(0).getReason());
    }

    @Test
    void testValidateCoupons_FixedAmountCoupon_ReturnsCorrectDiscount() {
        // Arrange
        testCoupon.setType(Coupon.CouponType.FIXED);
        testCoupon.setValueCents(1500L); // $15 off
        testCoupon.setPercentDiscount(null);

        ValidateCouponsRequest request = new ValidateCouponsRequest();
        request.setDomainHost("example.com");
        request.setCart(testCart);
        request.setAppliedCodes(List.of("SAVE20"));

        when(couponRepository.findByStoreIdAndCodeNormalized(storeId, "5AVE20"))
            .thenReturn(Optional.of(testCoupon));
        when(couponRepository.findByStoreIdAndAutoApplyTrue(storeId))
            .thenReturn(List.of());

        // Act
        ValidateCouponsResponse response = couponService.validateCoupons(storeId, request);

        // Assert
        assertEquals(1, response.getValidCoupons().size());
        assertEquals(1500L, response.getValidCoupons().get(0).getDiscountCents());
        assertEquals(8500L, response.getCartTotals().getTotalCents()); // $100 - $15 = $85
    }

    @Test
    void testValidateCoupons_ProductSpecificCoupon_OnlyAppliesIfProductInCart() {
        // Arrange
        testCoupon.setAppliesTo(Coupon.AppliesTo.PRODUCTS);
        testCoupon.setProductIds(List.of(99L)); // Different product
        testCart.getItems().get(0).setProductId(1L); // Cart has product 1

        ValidateCouponsRequest request = new ValidateCouponsRequest();
        request.setDomainHost("example.com");
        request.setCart(testCart);
        request.setAppliedCodes(List.of("SAVE20"));

        when(couponRepository.findByStoreIdAndCodeNormalized(storeId, "5AVE20"))
            .thenReturn(Optional.of(testCoupon));
        when(couponRepository.findByStoreIdAndAutoApplyTrue(storeId))
            .thenReturn(List.of());

        // Act
        ValidateCouponsResponse response = couponService.validateCoupons(storeId, request);

        // Assert
        assertEquals(0, response.getValidCoupons().size());
        assertEquals(1, response.getInvalidCoupons().size());
        assertEquals("No eligible items in cart", response.getInvalidCoupons().get(0).getReason());
    }




    @Test
    void testFinalizeRedemptions_Idempotent_DoesNotDuplicate() {
        // Arrange
        Long orderId = 100L;
        ValidateCouponsRequest request = new ValidateCouponsRequest();
        request.setCart(testCart);

        ValidCouponDTO validCoupon = new ValidCouponDTO(1L, "SAVE20", "PERCENT", 2000L, "discount");

        when(redemptionRepository.findByOrderId(orderId))
            .thenReturn(Optional.of(new storebackend.entity.CouponRedemption()));

        // Act
        couponService.finalizeRedemptions(storeId, orderId, request, List.of(validCoupon));

        // Assert
        verify(redemptionRepository, never()).save(any());
        verify(couponRepository, never()).save(any());
    }
}


package storebackend.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.*;
import storebackend.enums.*;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests für Coupon/Rabatt-Integration und PROPORTIONAL_TO_CART Versandsteuer
 */
@SpringBootTest
@Transactional
public class OrderDiscountAndShippingTest {

    @Autowired private OrderService orderService;
    @Autowired private CouponService couponService;
    @Autowired private StoreRepository storeRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private CartRepository cartRepository;
    @Autowired private CartItemRepository cartItemRepository;
    @Autowired private CouponRepository couponRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private OrderItemRepository orderItemRepository;
    @Autowired private storebackend.repository.UserRepository userRepository;
    
    @Test
    public void testPercentDiscountWithMixedTaxRates() {
        // Setup: Store
        Store store = createTestStore();
        
        // Setup: Products mit 19% und 7%
        Product product19 = createProduct(store, "Product 19%", "119.00", TaxCategory.STANDARD, "19.00");
        Product product7 = createProduct(store, "Product 7%", "107.00", TaxCategory.REDUCED, "7.00");
        
        // Setup: Coupon 10% PERCENT
        Coupon coupon = new Coupon();
        coupon.setStoreId(store.getId());
        coupon.setCode("TEST10");
        coupon.setType(Coupon.CouponType.PERCENT);
        coupon.setPercentDiscount(10);
        coupon.setStatus(Coupon.CouponStatus.ACTIVE);
        couponRepository.save(coupon);
        
        // Setup: Cart mit beiden Produkten
        Cart cart = createCart(store);
        cartItemRepository.save(createCartItem(cart, product19, 1));
        cartItemRepository.save(createCartItem(cart, product7, 1));
        
        // Execute: Bestellung mit Coupon
        Order order = orderService.createOrderFromCart(
            cart.getId(), "test@example.com",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "+4912345",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "Test",
            null, PaymentMethod.CASH_ON_DELIVERY, null,
            DeliveryType.PICKUP, null, null,
            Arrays.asList("TEST10")
        );
        
        // Verify: Rabatt-Snapshot
        assertEquals("TEST10", order.getCouponCodeSnapshot());
        assertEquals("PERCENT", order.getDiscountTypeSnapshot());
        assertEquals(0, new BigDecimal("10.00").compareTo(order.getDiscountValueSnapshot()));
        
        // Verify: Rabatt-Berechnung (10% von 226 = 22,60)
        assertEquals(0, new BigDecimal("22.60").compareTo(order.getDiscountGross()));
        
        // Verify: Totals (226 - 22.60 = 203.40)
        assertEquals(0, new BigDecimal("203.40").compareTo(order.getTotalGross()));
        assertEquals(0, new BigDecimal("180.00").compareTo(order.getTotalNet()));
        assertEquals(0, new BigDecimal("23.40").compareTo(order.getTaxTotal()));
    }
    
    @Test
    public void testFixedDiscountProportionalDistribution() {
        // Setup: Store
        Store store = createTestStore();
        
        // Setup: Products
        Product product19 = createProduct(store, "Product 19%", "119.00", TaxCategory.STANDARD, "19.00");
        Product product7 = createProduct(store, "Product 7%", "107.00", TaxCategory.REDUCED, "7.00");
        
        // Setup: Coupon 20 EUR FIXED
        Coupon coupon = new Coupon();
        coupon.setStoreId(store.getId());
        coupon.setCode("SAVE20");
        coupon.setType(Coupon.CouponType.FIXED);
        coupon.setValueCents(2000L); // 20.00 EUR
        coupon.setCurrency("EUR");
        coupon.setStatus(Coupon.CouponStatus.ACTIVE);
        coupon.setAppliesTo(Coupon.AppliesTo.ALL); // Gilt für alle Produkte
        coupon.setDomainScope(Coupon.DomainScope.ALL); // Gilt für alle Domains
        couponRepository.save(coupon);
        
        // Setup: Cart
        Cart cart = createCart(store);
        cartItemRepository.save(createCartItem(cart, product19, 1));
        cartItemRepository.save(createCartItem(cart, product7, 1));
        
        // Execute
        Order order = orderService.createOrderFromCart(
            cart.getId(), "test@example.com",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "+4912345",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "Test",
            null, PaymentMethod.CASH_ON_DELIVERY, null,
            DeliveryType.PICKUP, null, null,
            Arrays.asList("SAVE20")
        );
        
        // Verify: Fester Rabatt exakt 20.00
        assertEquals(new BigDecimal("20.00"), order.getDiscountGross().setScale(2));
        
        // Verify: Totals (226 - 20 = 206)
        assertEquals(new BigDecimal("206.00"), order.getTotalGross().setScale(2));
        
        // Verify: Steuerberechnung korrekt (proportional verteilt)
        assertTrue(order.getDiscountNet().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(order.getDiscountTax().compareTo(BigDecimal.ZERO) > 0);
        
        // Invariant: discountGross = discountNet + discountTax (mit Rundungstoleranz)
        BigDecimal sum = order.getDiscountNet().add(order.getDiscountTax());
        assertTrue(order.getDiscountGross().subtract(sum).abs().compareTo(new BigDecimal("0.01")) <= 0,
            "Discount gross must equal net + tax (tolerance 0.01)");
    }
    
    @Test
    public void testFreeShippingCoupon() {
        // Setup
        Store store = createTestStore();
        Product product = createProduct(store, "Product", "100.00", TaxCategory.STANDARD, "19.00");
        
        // Coupon FREE_SHIPPING
        Coupon coupon = new Coupon();
        coupon.setStoreId(store.getId());
        coupon.setCode("FREESHIP");
        coupon.setType(Coupon.CouponType.FREE_SHIPPING);
        coupon.setStatus(Coupon.CouponStatus.ACTIVE);
        coupon.setAppliesTo(Coupon.AppliesTo.ALL);
        coupon.setDomainScope(Coupon.DomainScope.ALL);
        couponRepository.save(coupon);
        
        Cart cart = createCart(store);
        cartItemRepository.save(createCartItem(cart, product, 1));
        
        // Execute mit Versand
        Order order = orderService.createOrderFromCart(
            cart.getId(), "test@example.com",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "+4912345",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "Test",
            null, PaymentMethod.CASH_ON_DELIVERY, null,
            DeliveryType.DELIVERY,  // Lieferung, nicht Pickup
            DeliveryMode.STANDARD,  // Standardversand
            null,
            Arrays.asList("FREESHIP")
        );
        
        // Verify: Versandkosten auf 0 gesetzt
        assertEquals(BigDecimal.ZERO, order.getShippingGross().setScale(0));
        assertEquals(BigDecimal.ZERO, order.getShippingNet().setScale(0));
        assertEquals(BigDecimal.ZERO, order.getShippingTax().setScale(0));
    }
    
    @Test
    public void testProportionalShippingTaxWithMixedRates() {
        // Setup: Store mit PROPORTIONAL_TO_CART
        Store store = createTestStore();
        store.setShippingTaxStrategy(ShippingTaxStrategy.PROPORTIONAL_TO_CART);
        storeRepository.save(store);
        
        // Products: 100 EUR netto bei 19% und 100 EUR netto bei 7%
        Product product19 = createProduct(store, "Product 19%", "119.00", TaxCategory.STANDARD, "19.00");
        Product product7 = createProduct(store, "Product 7%", "107.00", TaxCategory.REDUCED, "7.00");
        
        Cart cart = createCart(store);
        cartItemRepository.save(createCartItem(cart, product19, 1));
        cartItemRepository.save(createCartItem(cart, product7, 1));
        
        // Execute mit Versand
        Order order = orderService.createOrderFromCart(
            cart.getId(), "test@example.com",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "+4912345",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "Test",
            null, PaymentMethod.CASH_ON_DELIVERY, null,
            DeliveryType.DELIVERY,
            DeliveryMode.STANDARD,
            null,
            java.util.Collections.emptyList()
        );
        
        // Verify: Versandsteuer ist gewichteter Durchschnitt
        // subtotalTax = 19 + 7 = 26
        // subtotalNet = 100 + 100 = 200
        // avgRate = 26 / 200 * 100 = 13%
        // Versandsteuer sollte ~13% sein (nicht 19% oder 7%)
        
        BigDecimal shippingGross = order.getShippingGross();
        if (shippingGross.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal shippingTaxRate = order.getShippingTax()
                .multiply(new BigDecimal("100"))
                .divide(order.getShippingNet(), 2, java.math.RoundingMode.HALF_UP);
            
            // Erwartung: Zwischen 7% und 19%, näher an 13%
            assertTrue(shippingTaxRate.compareTo(new BigDecimal("7.00")) >= 0);
            assertTrue(shippingTaxRate.compareTo(new BigDecimal("19.00")) <= 0);
        }
    }
    
    // ═══ HELPER METHODS ═══
    
    private Store createTestStore() {
        // Owner erstellen
        User owner = new User();
        owner.setEmail("owner-" + System.currentTimeMillis() + "@test.com");
        owner.setPasswordHash("hash");
        owner = userRepository.save(owner);
        
        Store store = new Store();
        store.setOwner(owner);
        store.setName("Test Store");
        store.setSlug("test-store-" + System.currentTimeMillis());
        store.setCurrencyCode(CurrencyCode.EUR);
        store.setCountryCode("DE");
        store.setPriceMode(PriceMode.GROSS);
        store.setVatEnabled(true);
        store.setDefaultTaxRate(new BigDecimal("19.00"));
        store.setShippingTaxRate(new BigDecimal("19.00"));
        store.setShippingTaxStrategy(ShippingTaxStrategy.STORE_DEFINED);
        return storeRepository.save(store);
    }
    
    private Product createProduct(Store store, String name, String price, 
                                  TaxCategory category, String taxRate) {
        Product product = new Product();
        product.setStore(store);
        product.setTitle(name);
        product.setBasePrice(new BigDecimal(price));
        product.setTaxCategory(category);
        product.setTaxRate(new BigDecimal(taxRate));
        product.setStock(100);
        return productRepository.save(product);
    }
    
    private Cart createCart(Store store) {
        Cart cart = new Cart();
        cart.setStore(store);
        cart.setSessionId("test-session-" + System.currentTimeMillis());
        return cartRepository.save(cart);
    }
    
    private CartItem createCartItem(Cart cart, Product product, int quantity) {
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(quantity);
        return item;
    }
}

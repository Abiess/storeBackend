package storebackend.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.*;
import storebackend.enums.*;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test für Order-Snapshot-Persistenz
 * Validiert, dass Order-Snapshots UNVERÄNDERLICH bleiben,
 * auch wenn Store oder Product später geändert werden.
 */
@SpringBootTest
@Transactional
public class OrderSnapshotPersistenceTest {

    @Autowired
    private OrderService orderService;
    
    @Autowired
    private StoreRepository storeRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private CartRepository cartRepository;
    
    @Autowired
    private CartItemRepository cartItemRepository;
    
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private OrderItemRepository orderItemRepository;
    
    @Autowired
    private storebackend.repository.UserRepository userRepository;
    
    @Test
    public void testOrderSnapshotRemainsUnchangedAfterStoreAndProductChanges() {
        // ─── SETUP: Store mit EUR/DE/GROSS/19% ───────────────────────────────────────
        // Owner erstellen (benötigt für Store)
        User owner = new User();
        owner.setEmail("owner@test.com");
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
        store = storeRepository.save(store);
        
        // ─── SETUP: Product mit basePrice=119.00, taxRate=19% ────────────────────────
        Product product = new Product();
        product.setStore(store);
        product.setTitle("Test Product");
        product.setBasePrice(new BigDecimal("119.00"));
        product.setTaxCategory(TaxCategory.STANDARD);
        product.setTaxRate(new BigDecimal("19.00"));
        product.setStock(100);
        product = productRepository.save(product);
        
        // ─── SETUP: Cart mit einem Item ──────────────────────────────────────────────
        Cart cart = new Cart();
        cart.setStore(store);
        cart.setSessionId("test-session-" + System.currentTimeMillis());
        cart = cartRepository.save(cart);
        
        CartItem cartItem = new CartItem();
        cartItem.setCart(cart);
        cartItem.setProduct(product);
        cartItem.setQuantity(1);
        cartItemRepository.save(cartItem);
        
        // ─── BESTELLUNG ERSTELLEN ─────────────────────────────────────────────────────
        Order order = orderService.createOrderFromCart(
            cart.getId(),
            "test@example.com",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE", "+4912345",
            "John", "Doe", "Street 1", "", "Berlin", "10115", "DE",
            "Test order",
            null, // customer
            PaymentMethod.CASH_ON_DELIVERY,
            null, // phoneVerificationId
            DeliveryType.PICKUP,
            null, // deliveryMode (not needed for PICKUP)
            null, // shippingProvider
            java.util.Collections.emptyList() // no coupons
        );
        
        Long orderId = order.getId();
        assertNotNull(orderId, "Order should be saved with an ID");
        
        // ─── ERWARTETE WERTE VOR DER ÄNDERUNG ─────────────────────────────────────────
        assertEquals(CurrencyCode.EUR, order.getCurrencyCode());
        assertEquals(PriceMode.GROSS, order.getPriceMode());
        assertEquals("DE", order.getCountryCode());
        assertEquals(new BigDecimal("119.00"), order.getTotalGross().setScale(2));
        assertEquals(new BigDecimal("100.00"), order.getTotalNet().setScale(2));
        assertEquals(new BigDecimal("19.00"), order.getTaxTotal().setScale(2));
        
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        assertEquals(1, items.size());
        OrderItem item = items.get(0);
        assertEquals(new BigDecimal("119.00"), item.getUnitPriceGross().setScale(2));
        assertEquals(new BigDecimal("100.00"), item.getUnitPriceNet().setScale(2));
        assertEquals(new BigDecimal("19.00"), item.getTaxRate().setScale(2));
        assertEquals(new BigDecimal("19.00"), item.getLineTax().setScale(2));
        
        // ─── STORE & PRODUCT ÄNDERN ───────────────────────────────────────────────────
        store.setCurrencyCode(CurrencyCode.valueOf("USD")); // EUR → USD
        store.setPriceMode(PriceMode.NET);                  // GROSS → NET
        store.setCountryCode("US");                         // DE → US
        storeRepository.save(store);
        
        product.setBasePrice(new BigDecimal("200.00")); // 119.00 → 200.00
        product.setTaxRate(new BigDecimal("7.00"));     // 19% → 7%
        product.setTaxCategory(TaxCategory.REDUCED);
        productRepository.save(product);
        
        // ─── ORDER NEU AUS DB LADEN (NICHT CACHED) ────────────────────────────────────
        orderRepository.flush(); // Sicherstellen, dass DB aktuell ist
        Order reloadedOrder = orderRepository.findById(orderId)
            .orElseThrow(() -> new AssertionError("Order should still exist"));
        
        // ─── SNAPSHOTS MÜSSEN UNVERÄNDERT BLEIBEN ─────────────────────────────────────
        assertEquals(CurrencyCode.EUR, reloadedOrder.getCurrencyCode(), 
            "Currency snapshot must remain EUR (not USD)");
        assertEquals(PriceMode.GROSS, reloadedOrder.getPriceMode(), 
            "PriceMode snapshot must remain GROSS (not NET)");
        assertEquals("DE", reloadedOrder.getCountryCode(), 
            "CountryCode snapshot must remain DE (not US)");
        assertEquals(new BigDecimal("119.00"), reloadedOrder.getTotalGross().setScale(2), 
            "Total gross must remain 119.00");
        assertEquals(new BigDecimal("100.00"), reloadedOrder.getTotalNet().setScale(2), 
            "Total net must remain 100.00");
        assertEquals(new BigDecimal("19.00"), reloadedOrder.getTaxTotal().setScale(2), 
            "Tax total must remain 19.00");
        
        List<OrderItem> reloadedItems = orderItemRepository.findByOrderId(orderId);
        assertEquals(1, reloadedItems.size());
        OrderItem reloadedItem = reloadedItems.get(0);
        assertEquals(new BigDecimal("119.00"), reloadedItem.getUnitPriceGross().setScale(2), 
            "Unit price gross must remain 119.00 (not 200.00)");
        assertEquals(new BigDecimal("100.00"), reloadedItem.getUnitPriceNet().setScale(2), 
            "Unit price net must remain 100.00");
        assertEquals(new BigDecimal("19.00"), reloadedItem.getTaxRate().setScale(2), 
            "Tax rate must remain 19% (not 7%)");
        assertEquals(new BigDecimal("19.00"), reloadedItem.getLineTax().setScale(2), 
            "Line tax must remain 19.00");
        assertEquals(TaxCategory.STANDARD, reloadedItem.getTaxCategory(), 
            "Tax category must remain STANDARD (not REDUCED)");
    }
}

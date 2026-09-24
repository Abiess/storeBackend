package storebackend.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.*;
import storebackend.enums.DeliveryMode;
import storebackend.enums.DeliveryType;
import storebackend.enums.PaymentMethod;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration-Test für B2B-Felder in OrderService
 * 
 * Testet:
 * - company wird in shippingAddress übernommen
 * - company wird in billingAddress übernommen
 * - customerReference wird gespeichert
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class OrderServiceB2BIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository productVariantRepository;

    @Test
    void shouldSaveCompanyInShippingAddress() {
        // Arrange
        Store store = createTestStore();
        User user = createTestUser();
        Product product = createTestProduct(store);
        ProductVariant variant = createTestVariant(product);
        Cart cart = createTestCart(store, user, variant);

        // Act
        Order order = orderService.createOrderFromCart(
            cart.getId(),
            "test@example.com",
            "Max", "Mustermann",
            "Teststr. 123", "",
            "Berlin", "10115", "DE", "+49301234567",
            "Acme GmbH",  // shippingCompany
            "Max", "Mustermann",
            "Teststr. 123", "",
            "Berlin", "10115", "DE",
            "Acme GmbH",  // billingCompany
            "Test Notes",
            "PO-2026-0042",  // customerReference
            user,
            PaymentMethod.BANK_TRANSFER,
            null,
            DeliveryType.PICKUP,
            null,
            "PICKUP",
            Collections.emptyList()
        );

        // Assert
        assertNotNull(order);
        assertNotNull(order.getShippingAddress());
        assertEquals("Acme GmbH", order.getShippingAddress().getCompany());
        
        assertNotNull(order.getBillingAddress());
        assertEquals("Acme GmbH", order.getBillingAddress().getCompany());
        
        assertEquals("PO-2026-0042", order.getCustomerReference());
        assertEquals("Test Notes", order.getNotes());
    }

    @Test
    void shouldHandleNullCompany() {
        // Arrange
        Store store = createTestStore();
        User user = createTestUser();
        Product product = createTestProduct(store);
        ProductVariant variant = createTestVariant(product);
        Cart cart = createTestCart(store, user, variant);

        // Act
        Order order = orderService.createOrderFromCart(
            cart.getId(),
            "test@example.com",
            "Max", "Mustermann",
            "Teststr. 123", "",
            "Berlin", "10115", "DE", "+49301234567",
            null,  // shippingCompany
            "Max", "Mustermann",
            "Teststr. 123", "",
            "Berlin", "10115", "DE",
            null,  // billingCompany
            "Test Notes",
            null,  // customerReference
            user,
            PaymentMethod.CASH_ON_DELIVERY,
            null,
            DeliveryType.PICKUP,
            null,
            "PICKUP",
            Collections.emptyList()
        );

        // Assert
        assertNotNull(order);
        assertNull(order.getShippingAddress().getCompany());
        assertNull(order.getBillingAddress().getCompany());
        assertNull(order.getCustomerReference());
    }

    @Test
    void shouldHandleEmptyCompany() {
        // Arrange
        Store store = createTestStore();
        User user = createTestUser();
        Product product = createTestProduct(store);
        ProductVariant variant = createTestVariant(product);
        Cart cart = createTestCart(store, user, variant);

        // Act
        Order order = orderService.createOrderFromCart(
            cart.getId(),
            "test@example.com",
            "Max", "Mustermann",
            "Teststr. 123", "",
            "Berlin", "10115", "DE", "+49301234567",
            "",  // shippingCompany empty
            "Max", "Mustermann",
            "Teststr. 123", "",
            "Berlin", "10115", "DE",
            "",  // billingCompany empty
            null,
            "",  // customerReference empty
            user,
            PaymentMethod.CASH_ON_DELIVERY,
            null,
            DeliveryType.PICKUP,
            null,
            "PICKUP",
            Collections.emptyList()
        );

        // Assert
        assertNotNull(order);
        assertEquals("", order.getShippingAddress().getCompany());
        assertEquals("", order.getBillingAddress().getCompany());
        assertEquals("", order.getCustomerReference());
    }

    // Helper methods
    private Store createTestStore() {
        Store store = new Store();
        store.setName("Test Store " + System.currentTimeMillis());
        store.setSlug("test" + System.currentTimeMillis());  // NOT subdomain
        store.setCountryCode("DE");
        store.setCurrencyCode(storebackend.enums.CurrencyCode.EUR);
        store.setPriceMode(storebackend.enums.PriceMode.GROSS);
        store.setVatEnabled(true);
        return storeRepository.save(store);
    }

    private User createTestUser() {
        User user = new User();
        user.setEmail("test" + System.currentTimeMillis() + "@example.com");
        user.setPasswordHash("hash");
        // User has no firstName/lastName setters - these are not on User entity
        return userRepository.save(user);
    }

    private Product createTestProduct(Store store) {
        Product product = new Product();
        product.setStore(store);
        product.setTitle("Test Product");
        product.setBasePrice(new BigDecimal("19.99"));
        product.setStatus(storebackend.enums.ProductStatus.ACTIVE);
        product.setTaxCategory(storebackend.enums.TaxCategory.STANDARD);
        product.setTaxRate(new BigDecimal("19.00"));
        return productRepository.save(product);
    }

    private ProductVariant createTestVariant(Product product) {
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku("TEST-SKU-" + System.currentTimeMillis());
        variant.setPrice(product.getBasePrice());
        variant.setStockQuantity(100);
        return productVariantRepository.save(variant);
    }

    private Cart createTestCart(Store store, User user, ProductVariant variant) {
        Cart cart = new Cart();
        cart.setStore(store);
        cart.setUser(user);
        cart = cartRepository.save(cart);

        CartItem cartItem = new CartItem();
        cartItem.setCart(cart);
        cartItem.setVariant(variant);  // NOT setProductVariant
        cartItem.setQuantity(1);
        cartItem.setPrice(variant.getPrice());
        cartItemRepository.save(cartItem);

        return cart;
    }
}

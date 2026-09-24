package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import storebackend.dto.TierPriceCalculationResult;
import storebackend.entity.*;
import storebackend.enums.*;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Echter Verhaltenstest: OrderService.createOrderFromCart()
 * 
 * Testet, dass der OrderService bei Checkout den Preis serverseitig NEU berechnet
 * und NICHT den alten cartItem.priceSnapshot übernimmt.
 */
@ExtendWith(MockitoExtension.class)
public class OrderServiceCheckoutBehaviorTest {

    @Mock private OrderRepository orderRepository;
    @Mock private OrderItemRepository orderItemRepository;
    @Mock private OrderStatusHistoryRepository orderStatusHistoryRepository;
    @Mock private CartRepository cartRepository;
    @Mock private CartItemRepository cartItemRepository;
    @Mock private InventoryService inventoryService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private PublicDeliveryService publicDeliveryService;
    @Mock private TaxCalculationService taxCalculationService;
    @Mock private CouponService couponService;
    @Mock private storebackend.repository.CouponRepository couponRepository;
    @Mock private RevenueShareService revenueShareService;
    @Mock private StoreProductRepository storeProductRepository;
    @Mock private PlatformSettingsService platformSettingsService;
    @Mock private ProductTierPriceService tierPriceService;
    @Mock private ProductRepository productRepository;

    private OrderService orderService;

    private Store store;
    private User customer;
    private Product product;
    private Cart cart;
    private CartItem cartItem;

    @BeforeEach
    public void setup() {
        orderService = new OrderService(
            orderRepository, orderItemRepository, orderStatusHistoryRepository,
            cartRepository, cartItemRepository, inventoryService, eventPublisher,
            publicDeliveryService, taxCalculationService, couponService, couponRepository,
            revenueShareService, storeProductRepository, platformSettingsService,
            tierPriceService, productRepository
        );

        // Store
        store = new Store();
        store.setId(1L);
        store.setName("Test Store");
        store.setCurrencyCode(CurrencyCode.EUR);
        store.setCountryCode("DE");
        store.setPriceMode(PriceMode.GROSS);
        store.setVatEnabled(true);
        store.setDefaultTaxRate(new BigDecimal("19.00"));

        // Customer
        customer = new User();
        customer.setId(1L);
        customer.setEmail("test@test.com");

        // Product
        product = new Product();
        product.setId(100L);
        product.setTitle("Test Product");
        product.setBasePrice(new BigDecimal("10.00"));
        product.setTaxCategory(TaxCategory.STANDARD);
        product.setTaxRate(new BigDecimal("19.00"));

        // Cart
        cart = new Cart();
        cart.setId(1L);
        cart.setStore(store);
        cart.setUser(customer);

        // CartItem mit ALTEM Preis
        cartItem = new CartItem();
        cartItem.setId(1L);
        cartItem.setCart(cart);
        cartItem.setProduct(product);
        cartItem.setQuantity(15);
        cartItem.setPriceSnapshot(new BigDecimal("10.00")); // ❌ Alter Preis
    }

    @Test
    public void testCheckout_UsesNewTierPrice_NotOldCartPrice() {
        // ✅ Mocking Setup
        when(cartRepository.findById(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartId(1L)).thenReturn(List.of(cartItem));
        
        // ✅ KRITISCH: ProductRepository gibt frisches Produkt zurück
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));

        // ✅ KRITISCH: TierPriceService gibt NEUEN Staffelpreis zurück
        TierPriceCalculationResult tierResult = TierPriceCalculationResult.withTierPrice(
            new BigDecimal("10.00"),  // baseUnitPrice
            new BigDecimal("8.00"),   // effectiveUnitPrice (NEU!)
            10                         // appliedTierMinimumQuantity
        );
        when(tierPriceService.calculateWithDetails(eq(product), any(BigDecimal.class), eq(15)))
            .thenReturn(tierResult);

        // ✅ TaxCalculationService
        TaxCalculationService.TaxBreakdown taxBreakdown = new TaxCalculationService.TaxBreakdown(
            new BigDecimal("6.72"),
            new BigDecimal("1.28"),
            new BigDecimal("8.00")  // gross = effectiveUnitPrice
        );
        when(taxCalculationService.calculatePriceBreakdown(any(), any(), any()))
            .thenReturn(taxBreakdown);

        // ✅ OrderRepository
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(1L);
            o.setOrderNumber("ORD-123");
            return o;
        });

        // ✅ ArgumentCaptor für OrderItem
        ArgumentCaptor<List<OrderItem>> orderItemsCaptor = ArgumentCaptor.forClass(List.class);
        when(orderItemRepository.saveAll(orderItemsCaptor.capture())).thenAnswer(inv -> inv.getArgument(0));

        // ✅ Act: Checkout ausführen
        orderService.createOrderFromCart(
            1L, "test@test.com",
            "Max", "Mustermann", "Street 1", null, "Berlin", "10115", "DE", "+491234567890",
            null,  // shippingCompany
            "Max", "Mustermann", "Street 1", null, "Berlin", "10115", "DE",
            null,  // billingCompany
            null,  // notes
            null,  // customerReference
            customer, PaymentMethod.CASH_ON_DELIVERY, null,
            DeliveryType.PICKUP, null, null, List.of()
        );

        // ✅ Assert: ProductRepository wurde aufgerufen (Produkt frisch geladen)
        verify(productRepository, times(1)).findById(100L);

        // ✅ Assert: TierPriceService wurde aufgerufen
        verify(tierPriceService, times(1)).calculateWithDetails(
            eq(product), 
            any(BigDecimal.class), 
            eq(15)
        );

        // ✅ Assert: OrderItemRepository wurde aufgerufen
        verify(orderItemRepository, atLeastOnce()).saveAll(any());

        // ✅ KRITISCH: Prüfe gespeichertes OrderItem
        List<OrderItem> savedOrderItems = orderItemsCaptor.getValue();
        assertThat(savedOrderItems).isNotEmpty();
        OrderItem savedOrderItem = savedOrderItems.get(0);
        assertThat(savedOrderItem.getProduct()).isEqualTo(product);
        assertThat(savedOrderItem.getQuantity()).isEqualTo(15);
        
        // ✅ KRITISCH: UnitPriceGross muss 8.00 sein (NEU berechnet), NICHT 10.00 (CartItem)
        assertThat(savedOrderItem.getUnitPriceGross()).isEqualByComparingTo(new BigDecimal("8.00"));

        System.out.println("✅ Test bestanden: OrderService verwendet NEU berechneten Staffelpreis");
        System.out.println("   - CartItem.priceSnapshot = 10.00 (ignoriert)");
        System.out.println("   - TierPriceService liefert = 8.00");
        System.out.println("   - OrderItem.unitPriceGross = " + savedOrderItem.getUnitPriceGross());
    }

    @Test
    public void testCheckout_UsesVariantPrice_NotProductPrice() {
        // Variante mit eigenem Preis
        ProductVariant variant = new ProductVariant();
        variant.setId(10L);
        variant.setProduct(product);
        variant.setPrice(new BigDecimal("12.00")); // Variantenpreis
        variant.setSku("VAR-001");

        cartItem.setVariant(variant);
        cartItem.setPriceSnapshot(new BigDecimal("12.00"));

        when(cartRepository.findById(1L)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartId(1L)).thenReturn(List.of(cartItem));
        when(productRepository.findById(100L)).thenReturn(Optional.of(product));

        // ✅ Staffelpreis basiert auf Varianten-Preis
        TierPriceCalculationResult tierResult = TierPriceCalculationResult.withTierPrice(
            new BigDecimal("12.00"),  // baseUnitPrice (Variante!)
            new BigDecimal("10.50"),  // effectiveUnitPrice
            10
        );
        
        ArgumentCaptor<BigDecimal> basePriceCaptor = ArgumentCaptor.forClass(BigDecimal.class);
        when(tierPriceService.calculateWithDetails(eq(product), basePriceCaptor.capture(), eq(15)))
            .thenReturn(tierResult);

        TaxCalculationService.TaxBreakdown taxBreakdown = new TaxCalculationService.TaxBreakdown(
            new BigDecimal("8.82"), new BigDecimal("1.68"), new BigDecimal("10.50")
        );
        when(taxCalculationService.calculatePriceBreakdown(any(), any(), any()))
            .thenReturn(taxBreakdown);

        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(1L);
            o.setOrderNumber("ORD-124");
            return o;
        });
        when(orderItemRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        orderService.createOrderFromCart(
            1L, "test@test.com",
            "Max", "Mustermann", "Street 1", null, "Berlin", "10115", "DE", "+491234567890",
            null,  // shippingCompany
            "Max", "Mustermann", "Street 1", null, "Berlin", "10115", "DE",
            null,  // billingCompany
            null,  // notes
            null,  // customerReference
            customer, PaymentMethod.CASH_ON_DELIVERY, null,
            DeliveryType.PICKUP, null, null, List.of()
        );

        // ✅ Assert: calculateWithDetails wurde mit Varianten-Preis 12.00 aufgerufen
        BigDecimal capturedBasePrice = basePriceCaptor.getValue();
        assertThat(capturedBasePrice).isEqualByComparingTo(new BigDecimal("12.00"));

        verify(tierPriceService, times(1)).calculateWithDetails(eq(product), any(BigDecimal.class), eq(15));

        System.out.println("✅ Test bestanden: Variantenpreis wird als basePrice verwendet");
        System.out.println("   - Produkt-Basispreis = 10.00");
        System.out.println("   - Varianten-Preis = 12.00");
        System.out.println("   - calculateWithDetails basePrice = " + capturedBasePrice);
    }
}

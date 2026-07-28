package storebackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.TierPriceCalculationResult;
import storebackend.entity.*;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.service.CartService;
import storebackend.service.ProductService;
import storebackend.service.ProductTierPriceService;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Echter Verhaltenstest: CartController.buildCartResponse()
 * 
 * Testet, dass die API-Antwort tatsächlich die Staffelpreis-Metadaten enthält.
 */
@ExtendWith(MockitoExtension.class)
public class CartControllerMappingBehaviorTest {

    @Mock private CartService cartService;
    @Mock private StoreRepository storeRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProductService productService;
    @Mock private JwtUtil jwtUtil;
    @Mock private ProductTierPriceService tierPriceService;

    private CartController cartController;

    private Store store;
    private Cart cart;
    private Product product;
    private CartItem cartItem;

    @BeforeEach
    public void setup() {
        cartController = new CartController(
            cartService,
            storeRepository,
            userRepository,
            productService,
            jwtUtil,
            tierPriceService
        );

        // Store
        store = new Store();
        store.setId(1L);
        store.setName("Test Store");

        // Cart
        cart = new Cart();
        cart.setId(1L);
        cart.setStore(store);
        cart.setSessionId("test-session-123");

        // Product
        product = new Product();
        product.setId(100L);
        product.setTitle("Test Product");
        product.setBasePrice(new BigDecimal("10.00"));

        // CartItem
        cartItem = new CartItem();
        cartItem.setId(1L);
        cartItem.setCart(cart);
        cartItem.setProduct(product);
        cartItem.setQuantity(15);
        cartItem.setPriceSnapshot(new BigDecimal("10.00"));
    }

    @Test
    public void testBuildCartResponse_IncludesTierPriceMetadata() {
        // ✅ Mock: ProductService
        when(productService.resolveProductImageUrl(any(Product.class)))
            .thenReturn("https://example.com/product.jpg");

        // ✅ Mock: TierPriceService gibt Staffelpreis zurück
        TierPriceCalculationResult tierResult = TierPriceCalculationResult.withTierPrice(
            new BigDecimal("10.00"),  // baseUnitPrice
            new BigDecimal("8.00"),   // effectiveUnitPrice
            10                         // appliedTierMinimumQuantity
        );
        when(tierPriceService.calculateWithDetails(eq(product), any(BigDecimal.class), eq(15)))
            .thenReturn(tierResult);

        // ✅ Act: buildCartResponse aufrufen
        Map<String, Object> response = cartController.buildCartResponse(cart, List.of(cartItem));

        // ✅ Assert: Response-Struktur
        assertThat(response).containsKey("items");
        assertThat(response).containsKey("id");
        assertThat(response).containsKey("storeId");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
        assertThat(items).hasSize(1);

        Map<String, Object> itemDto = items.get(0);

        // ✅ Assert: Legacy-Felder
        assertThat(itemDto).containsKey("id");
        assertThat(itemDto).containsKey("quantity");
        assertThat(itemDto).containsKey("price");

        // ✅ KRITISCH: Staffelpreis-Metadaten vorhanden
        assertThat(itemDto).containsKey("baseUnitPrice");
        assertThat(itemDto).containsKey("effectiveUnitPrice");
        assertThat(itemDto).containsKey("tierPriceApplied");
        assertThat(itemDto).containsKey("appliedTierMinimumQuantity");

        // ✅ KRITISCH: Werte korrekt
        assertThat(itemDto.get("baseUnitPrice")).isEqualTo(new BigDecimal("10.00"));
        assertThat(itemDto.get("effectiveUnitPrice")).isEqualTo(new BigDecimal("8.00"));
        assertThat(itemDto.get("tierPriceApplied")).isEqualTo(true);
        assertThat(itemDto.get("appliedTierMinimumQuantity")).isEqualTo(10);

        // ✅ Verify: tierPriceService aufgerufen
        verify(tierPriceService, times(1)).calculateWithDetails(eq(product), any(BigDecimal.class), eq(15));

        System.out.println("✅ Test bestanden: API-Antwort enthält Staffelpreis-Metadaten");
        System.out.println("   - baseUnitPrice: 10.00");
        System.out.println("   - effectiveUnitPrice: 8.00");
        System.out.println("   - tierPriceApplied: true");
        System.out.println("   - appliedTierMinimumQuantity: 10");
    }

    @Test
    public void testBuildCartResponse_NoTierPrice() {
        when(productService.resolveProductImageUrl(any(Product.class)))
            .thenReturn("https://example.com/product.jpg");

        // ✅ Kein Staffelpreis erreicht
        TierPriceCalculationResult tierResult = TierPriceCalculationResult.withoutTierPrice(
            new BigDecimal("10.00")
        );
        when(tierPriceService.calculateWithDetails(eq(product), any(BigDecimal.class), eq(15)))
            .thenReturn(tierResult);

        Map<String, Object> response = cartController.buildCartResponse(cart, List.of(cartItem));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
        Map<String, Object> itemDto = items.get(0);

        // ✅ Assert: Alle Felder vorhanden (konsistente API)
        assertThat(itemDto).containsKey("baseUnitPrice");
        assertThat(itemDto).containsKey("effectiveUnitPrice");
        assertThat(itemDto).containsKey("tierPriceApplied");
        assertThat(itemDto).containsKey("appliedTierMinimumQuantity");

        // ✅ Assert: Werte korrekt
        assertThat(itemDto.get("baseUnitPrice")).isEqualTo(new BigDecimal("10.00"));
        assertThat(itemDto.get("effectiveUnitPrice")).isEqualTo(new BigDecimal("10.00"));
        assertThat(itemDto.get("tierPriceApplied")).isEqualTo(false);
        assertThat(itemDto.get("appliedTierMinimumQuantity")).isNull();

        System.out.println("✅ Test bestanden: Kein Staffelpreis → tierPriceApplied=false");
    }

    @Test
    public void testBuildCartResponse_WithVariantPrice() {
        // Variante mit eigenem Preis
        ProductVariant variant = new ProductVariant();
        variant.setId(10L);
        variant.setProduct(product);
        variant.setPrice(new BigDecimal("12.00"));
        variant.setSku("VAR-001");
        variant.setImageUrl("https://example.com/variant.jpg");

        cartItem.setVariant(variant);
        cartItem.setPriceSnapshot(new BigDecimal("12.00"));

        // ✅ Staffelpreis basiert auf Varianten-Preis
        TierPriceCalculationResult tierResult = TierPriceCalculationResult.withTierPrice(
            new BigDecimal("12.00"),  // baseUnitPrice (Variante)
            new BigDecimal("10.50"),  // effectiveUnitPrice
            10
        );
        when(tierPriceService.calculateWithDetails(eq(product), any(BigDecimal.class), eq(15)))
            .thenReturn(tierResult);

        Map<String, Object> response = cartController.buildCartResponse(cart, List.of(cartItem));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
        Map<String, Object> itemDto = items.get(0);

        // ✅ Assert: Variantenpreis als Base
        assertThat(itemDto.get("baseUnitPrice")).isEqualTo(new BigDecimal("12.00"));
        assertThat(itemDto.get("effectiveUnitPrice")).isEqualTo(new BigDecimal("10.50"));
        assertThat(itemDto.get("tierPriceApplied")).isEqualTo(true);

        // ✅ Verify: calculateWithDetails mit Varianten-Preis aufgerufen
        verify(tierPriceService, times(1)).calculateWithDetails(
            eq(product), 
            any(BigDecimal.class), 
            eq(15)
        );

        System.out.println("✅ Test bestanden: Variantenpreis wird als basePrice verwendet");
    }

    @Test
    public void testBuildCartResponse_ProductNull_ConsistentAPI() {
        // CartItem ohne Produkt
        CartItem emptyItem = new CartItem();
        emptyItem.setId(2L);
        emptyItem.setCart(cart);
        emptyItem.setQuantity(5);
        emptyItem.setPriceSnapshot(new BigDecimal("7.50"));
        // Product = null

        Map<String, Object> response = cartController.buildCartResponse(cart, List.of(emptyItem));

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) response.get("items");
        Map<String, Object> itemDto = items.get(0);

        // ✅ KRITISCH: Alle Felder vorhanden (konsistente API)
        assertThat(itemDto).containsKey("baseUnitPrice");
        assertThat(itemDto).containsKey("effectiveUnitPrice");
        assertThat(itemDto).containsKey("tierPriceApplied");
        assertThat(itemDto).containsKey("appliedTierMinimumQuantity");

        // ✅ KRITISCH: Fallback-Werte
        assertThat(itemDto.get("baseUnitPrice")).isEqualTo(new BigDecimal("7.50")); // priceSnapshot
        assertThat(itemDto.get("effectiveUnitPrice")).isEqualTo(new BigDecimal("7.50"));
        assertThat(itemDto.get("tierPriceApplied")).isEqualTo(false);
        assertThat(itemDto.get("appliedTierMinimumQuantity")).isNull();

        // ✅ Verify: tierPriceService NICHT aufgerufen
        verify(tierPriceService, never()).calculateWithDetails(any(), any(), anyInt());

        System.out.println("✅ Test bestanden: Product=null → konsistente API-Antwort mit Fallback-Werten");
    }
}

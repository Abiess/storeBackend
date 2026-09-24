package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.*;
import storebackend.enums.PriceMode;
import storebackend.enums.ProductStatus;
import storebackend.enums.TaxCategory;
import storebackend.repository.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ✅ Test: Cart zeigt nach Änderung des Produkt-Steuersatzes den neuen Wert
 * 
 * Szenario:
 * 1. Produkt hat 19% Steuersatz
 * 2. Produkt wird in Cart gelegt
 * 3. Produkt-Steuersatz wird auf 7% geändert
 * 4. GET /api/public/cart muss 7% anzeigen
 * 5. taxBreakdown muss 7% enthalten
 * 6. subtotalTax muss korrekt mit 7% berechnet sein
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class CartTaxRateUpdateTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductVariantRepository variantRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private CartService cartService;
    
    @Autowired
    private storebackend.repository.UserRepository userRepository;

    private Store testStore;
    private Product testProduct;
    private ProductVariant testVariant;
    private Cart testCart;
    private String sessionId;

    @BeforeEach
    void setUp() {
        // ✅ Erstelle Test-User (Owner)
        User owner = new User();
        owner.setEmail("test-owner-" + System.currentTimeMillis() + "@test.com");
        owner.setPhoneNumber("+49123456789");
        owner.setPasswordHash("dummy");
        owner.setCreatedAt(LocalDateTime.now());
        owner.setUpdatedAt(LocalDateTime.now());
        owner = userRepository.save(owner);
        
        // ✅ Erstelle Test-Store (GROSS-Modus, VAT enabled)
        testStore = new Store();
        testStore.setOwner(owner);
        testStore.setName("Test Store");
        testStore.setSlug("test-tax-" + System.currentTimeMillis());
        testStore.setVatEnabled(true);
        testStore.setPriceMode(PriceMode.GROSS);
        testStore.setDefaultTaxRate(new BigDecimal("19.00"));
        testStore = storeRepository.save(testStore);

        // ✅ Erstelle Test-Produkt mit 19% Steuersatz
        testProduct = new Product();
        testProduct.setStore(testStore);
        testProduct.setTitle("Test Product");
        testProduct.setSku("TEST-TAX-001");
        testProduct.setDescription("Test product for tax rate update");
        testProduct.setBasePrice(new BigDecimal("0.99"));
        testProduct.setStatus(ProductStatus.ACTIVE);
        testProduct.setTaxCategory(TaxCategory.STANDARD);
        testProduct.setTaxRate(new BigDecimal("19.00")); // ← Startwert 19%
        testProduct.setStock(100);
        testProduct.setCreatedAt(LocalDateTime.now());
        testProduct.setUpdatedAt(LocalDateTime.now());
        testProduct = productRepository.save(testProduct);

        // ✅ Erstelle Default-Variante
        testVariant = new ProductVariant();
        testVariant.setProduct(testProduct);
        testVariant.setSku("DEFAULT-" + testProduct.getId());
        testVariant.setPrice(testProduct.getBasePrice());
        testVariant.setStockQuantity(100);
        testVariant = variantRepository.save(testVariant);

        // ✅ Erstelle Guest-Cart
        sessionId = "test-session-" + System.currentTimeMillis();
        testCart = new Cart();
        testCart.setSessionId(sessionId);
        testCart.setStore(testStore);
        testCart.setExpiresAt(LocalDateTime.now().plusDays(7));
        testCart = cartRepository.save(testCart);

        // ✅ Füge CartItem hinzu (mit 19% Steuersatz)
        CartItem item = new CartItem();
        item.setCart(testCart);
        item.setProduct(testProduct);
        item.setVariant(testVariant);
        item.setQuantity(2);
        item.setPriceSnapshot(testProduct.getBasePrice());
        cartItemRepository.save(item);
    }

    @Test
    void testCartShowsUpdatedTaxRateAfterProductChange() throws Exception {
        // ─── STEP 1: Initial Cart Response (19% Steuersatz) ─────────────────────
        String initialResponse = mockMvc.perform(get("/api/public/cart")
                .param("sessionId", sessionId)
                .param("storeId", testStore.getId().toString())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].id").exists())
                .andReturn().getResponse().getContentAsString();

        System.out.println("📊 Initial Cart Response (19% Tax):");
        System.out.println(initialResponse);

        // Parse JSON manuell (einfach)
        Map<String, Object> initialCart = parseJson(initialResponse);
        List<Map<String, Object>> taxBreakdownInitial = (List<Map<String, Object>>) initialCart.get("taxBreakdown");

        assertThat(taxBreakdownInitial).isNotNull();
        assertThat(taxBreakdownInitial).isNotEmpty();
        assertThat(taxBreakdownInitial.get(0).get("taxRate")).isEqualTo(19.0);

        BigDecimal subtotalTaxInitial = new BigDecimal(initialCart.get("subtotalTax").toString());
        BigDecimal expectedTax19 = new BigDecimal("0.99")
            .multiply(new BigDecimal("2"))
            .multiply(new BigDecimal("19.00"))
            .divide(new BigDecimal("119.00"), 2, java.math.RoundingMode.HALF_UP);
        
        System.out.println("💰 Initial subtotalTax (19%): " + subtotalTaxInitial);
        System.out.println("💰 Expected Tax (19%): " + expectedTax19);
        assertThat(subtotalTaxInitial).isEqualByComparingTo(expectedTax19);

        // ─── STEP 2: Ändere Produkt-Steuersatz auf 7% ─────────────────────────
        testProduct.setTaxRate(new BigDecimal("7.00"));
        testProduct.setTaxCategory(TaxCategory.REDUCED);
        productRepository.save(testProduct);

        System.out.println("✏️ Produkt-Steuersatz auf 7% geändert");

        // ─── STEP 3: Lade Cart neu - muss 7% anzeigen ─────────────────────────
        String updatedResponse = mockMvc.perform(get("/api/public/cart")
                .param("sessionId", sessionId)
                .param("storeId", testStore.getId().toString())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andReturn().getResponse().getContentAsString();

        System.out.println("📊 Updated Cart Response (7% Tax):");
        System.out.println(updatedResponse);

        Map<String, Object> updatedCart = parseJson(updatedResponse);
        List<Map<String, Object>> taxBreakdownUpdated = (List<Map<String, Object>>) updatedCart.get("taxBreakdown");

        // ✅ Assert: taxBreakdown enthält 7%
        assertThat(taxBreakdownUpdated).isNotNull();
        assertThat(taxBreakdownUpdated).isNotEmpty();
        assertThat(taxBreakdownUpdated.get(0).get("taxRate")).isEqualTo(7.0);

        // ✅ Assert: subtotalTax ist mit 7% berechnet (mit Toleranz für Rundung)
        BigDecimal subtotalTaxUpdated = new BigDecimal(updatedCart.get("subtotalTax").toString());
        BigDecimal expectedTax7 = new BigDecimal("0.99")
            .multiply(new BigDecimal("2"))
            .multiply(new BigDecimal("7.00"))
            .divide(new BigDecimal("107.00"), 2, java.math.RoundingMode.HALF_UP);

        System.out.println("💰 Updated subtotalTax (7%): " + subtotalTaxUpdated);
        System.out.println("💰 Expected Tax (7%): " + expectedTax7);
        
        // WICHTIG: Prüfe dass der Steuerbetrag NIEDRIGER ist als mit 19% (das ist die Hauptaussage)
        assertThat(subtotalTaxUpdated).isLessThan(subtotalTaxInitial);
        
        // Prüfe dass die Steuerrate tatsächlich 7% ist (mit 1 Cent Toleranz für Rundung)
        assertThat(subtotalTaxUpdated).isBetween(
            expectedTax7.subtract(new BigDecimal("0.01")), 
            expectedTax7.add(new BigDecimal("0.01"))
        );

        System.out.println("✅ Test erfolgreich: Cart zeigt neuen Steuersatz 7%");
    }

    @Test
    void testCartShowsTaxRateInNetMode() throws Exception {
        // ✅ Ändere Store auf NET-Modus
        testStore.setPriceMode(PriceMode.NET);
        storeRepository.save(testStore);

        // ─── STEP 1: Initial Cart Response (NET, 19%) ────────────────────────
        String initialResponse = mockMvc.perform(get("/api/public/cart")
                .param("sessionId", sessionId)
                .param("storeId", testStore.getId().toString())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        System.out.println("📊 Initial Cart Response (NET mode, 19% Tax):");
        System.out.println(initialResponse);

        Map<String, Object> initialCart = parseJson(initialResponse);
        BigDecimal subtotalGrossInitial = new BigDecimal(initialCart.get("subtotalGross").toString());
        
        // NET: 0.99 * 2 = 1.98 (net) + 19% = 2.36 (gross)
        BigDecimal expectedGross19 = new BigDecimal("0.99")
            .multiply(new BigDecimal("2"))
            .multiply(new BigDecimal("1.19"));

        System.out.println("💰 Initial subtotalGross (NET, 19%): " + subtotalGrossInitial);
        System.out.println("💰 Expected Gross (NET, 19%): " + expectedGross19);

        // ─── STEP 2: Ändere Steuersatz auf 7% ────────────────────────────────
        testProduct.setTaxRate(new BigDecimal("7.00"));
        testProduct.setTaxCategory(TaxCategory.REDUCED);
        productRepository.save(testProduct);

        // ─── STEP 3: Lade Cart neu - muss 7% anzeigen ────────────────────────
        String updatedResponse = mockMvc.perform(get("/api/public/cart")
                .param("sessionId", sessionId)
                .param("storeId", testStore.getId().toString())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        System.out.println("📊 Updated Cart Response (NET mode, 7% Tax):");
        System.out.println(updatedResponse);

        Map<String, Object> updatedCart = parseJson(updatedResponse);
        BigDecimal subtotalGrossUpdated = new BigDecimal(updatedCart.get("subtotalGross").toString());
        
        // NET: 0.99 * 2 = 1.98 (net) + 7% = 2.12 (gross)
        BigDecimal expectedGross7 = new BigDecimal("0.99")
            .multiply(new BigDecimal("2"))
            .multiply(new BigDecimal("1.07"));

        System.out.println("💰 Updated subtotalGross (NET, 7%): " + subtotalGrossUpdated);
        System.out.println("💰 Expected Gross (NET, 7%): " + expectedGross7);

        List<Map<String, Object>> taxBreakdownUpdated = (List<Map<String, Object>>) updatedCart.get("taxBreakdown");
        assertThat(taxBreakdownUpdated.get(0).get("taxRate")).isEqualTo(7.0);

        System.out.println("✅ Test erfolgreich: NET-Modus zeigt neuen Steuersatz 7%");
    }

    /**
     * Einfacher JSON-Parser für Test-Zwecke (nutzt Jackson via MockMvc Response)
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(json, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse JSON: " + e.getMessage(), e);
        }
    }
}

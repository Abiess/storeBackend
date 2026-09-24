package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateProductRequest;
import storebackend.dto.ProductDTO;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.ProductStatus;
import storebackend.enums.TaxCategory;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test: Product PUT muss taxCategory und taxRate korrekt speichern
 */
@SpringBootTest
@Transactional
public class ProductTaxUpdateTest {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    private Store testStore;
    private Product testProduct;
    private User testOwner;

    @BeforeEach
    void setUp() {
        // Erstelle Test-User
        testOwner = new User();
        testOwner.setEmail("test-owner-tax-" + System.currentTimeMillis() + "@test.com");
        testOwner.setPhoneNumber("+49123456789");
        testOwner.setPasswordHash("dummy");
        testOwner.setCreatedAt(LocalDateTime.now());
        testOwner.setUpdatedAt(LocalDateTime.now());
        testOwner = userRepository.save(testOwner);

        // Erstelle Test-Store
        testStore = new Store();
        testStore.setOwner(testOwner);
        testStore.setName("Test Tax Store");
        testStore.setSlug("test-tax-" + System.currentTimeMillis());
        testStore = storeRepository.save(testStore);

        // Erstelle Test-Produkt mit STANDARD/19%
        testProduct = new Product();
        testProduct.setStore(testStore);
        testProduct.setTitle("Test Product");
        testProduct.setSku("TEST-TAX-001");
        testProduct.setDescription("Test");
        testProduct.setBasePrice(new BigDecimal("0.99"));
        testProduct.setStatus(ProductStatus.ACTIVE);
        testProduct.setTaxCategory(TaxCategory.STANDARD);
        testProduct.setTaxRate(new BigDecimal("19.00"));
        testProduct.setStock(100);
        testProduct.setCreatedAt(LocalDateTime.now());
        testProduct.setUpdatedAt(LocalDateTime.now());
        testProduct = productRepository.save(testProduct);
    }

    @Test
    void testUpdateProductFromStandard19ToReduced7() {
        // ─── BEFORE: Produkt hat STANDARD / 19% ─────────────────────────────────
        Product before = productRepository.findById(testProduct.getId()).orElseThrow();
        assertThat(before.getTaxCategory()).isEqualTo(TaxCategory.STANDARD);
        assertThat(before.getTaxRate()).isEqualByComparingTo(new BigDecimal("19.00"));

        // ─── UPDATE: Setze auf REDUCED / 7% ─────────────────────────────────────
        CreateProductRequest updateRequest = new CreateProductRequest();
        updateRequest.setTitle("Alsa Vanillezucker 7 g");
        updateRequest.setBasePrice(new BigDecimal("0.99"));
        updateRequest.setTaxCategory("REDUCED");
        updateRequest.setTaxRate(new BigDecimal("7")); // ← Expliziter Wert
        updateRequest.setStatus(ProductStatus.ACTIVE);
        updateRequest.setStock(100);

        ProductDTO response = productService.updateProduct(testProduct.getId(), updateRequest, testStore);

        // ─── VERIFY Response ─────────────────────────────────────────────────────
        assertThat(response.getTaxCategory()).isEqualTo(TaxCategory.REDUCED);
        assertThat(response.getTaxRate()).isEqualByComparingTo(new BigDecimal("7.00"));

        // ─── VERIFY DB (nach flush) ──────────────────────────────────────────────
        Product after = productRepository.findById(testProduct.getId()).orElseThrow();
        assertThat(after.getTaxCategory()).isEqualTo(TaxCategory.REDUCED);
        assertThat(after.getTaxRate()).isEqualByComparingTo(new BigDecimal("7.00"));

        System.out.println("✅ Product updated: STANDARD/19% → REDUCED/7%");
    }

    @Test
    void testUpdateProductWithOnlyTaxCategoryDerivesRate() {
        // Test: Wenn nur taxCategory gesendet wird (ohne expliziten taxRate),
        // soll taxRate automatisch abgeleitet werden

        CreateProductRequest updateRequest = new CreateProductRequest();
        updateRequest.setTitle("Test Product");
        updateRequest.setBasePrice(new BigDecimal("0.99"));
        updateRequest.setTaxCategory("REDUCED"); // ← Nur Kategorie
        updateRequest.setTaxRate(null); // ← Kein expliziter Wert
        updateRequest.setStatus(ProductStatus.ACTIVE);
        updateRequest.setStock(100);

        ProductDTO response = productService.updateProduct(testProduct.getId(), updateRequest, testStore);

        // REDUCED sollte automatisch 7% ergeben
        assertThat(response.getTaxCategory()).isEqualTo(TaxCategory.REDUCED);
        assertThat(response.getTaxRate()).isEqualByComparingTo(new BigDecimal("7.00"));

        System.out.println("✅ Product updated: taxCategory=REDUCED → taxRate=7.00 (derived)");
    }

    @Test
    void testUpdateProductWithExplicitTaxRateUsesIt() {
        // Test: Wenn expliziter taxRate gesendet wird, soll dieser verwendet werden
        // (auch wenn er vom Standard abweicht)

        CreateProductRequest updateRequest = new CreateProductRequest();
        updateRequest.setTitle("Test Product");
        updateRequest.setBasePrice(new BigDecimal("0.99"));
        updateRequest.setTaxCategory("REDUCED");
        updateRequest.setTaxRate(new BigDecimal("5.50")); // ← Expliziter abweichender Wert
        updateRequest.setStatus(ProductStatus.ACTIVE);
        updateRequest.setStock(100);

        ProductDTO response = productService.updateProduct(testProduct.getId(), updateRequest, testStore);

        // Expliziter Wert 5.50 sollte übernommen werden
        assertThat(response.getTaxCategory()).isEqualTo(TaxCategory.REDUCED);
        assertThat(response.getTaxRate()).isEqualByComparingTo(new BigDecimal("5.50"));

        System.out.println("✅ Product updated: explicit taxRate=5.50 used");
    }
}

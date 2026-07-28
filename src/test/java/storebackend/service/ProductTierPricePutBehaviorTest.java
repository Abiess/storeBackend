package storebackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.ProductTierPriceDTO;
import storebackend.entity.Product;
import storebackend.entity.ProductTierPrice;
import storebackend.entity.Store;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductTierPriceRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Tests für ProductTierPriceService PUT-Verhalten.
 */
@ExtendWith(MockitoExtension.class)
public class ProductTierPricePutBehaviorTest {

    @Mock
    private ProductTierPriceRepository tierPriceRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ProductTierPriceService tierPriceService;

    @Test
    void updateTierPrice_shouldNormalizeBigDecimalToTwoDecimals() {
        // Arrange
        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(645L);
        product.setStore(store);

        ProductTierPrice existing = new ProductTierPrice();
        existing.setId(3L);
        existing.setProduct(product);
        existing.setMinimumQuantity(10);
        existing.setUnitPrice(new BigDecimal("10.00"));
        existing.setActive(true);
        existing.setSortOrder(10);

        when(tierPriceRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(tierPriceRepository.save(any(ProductTierPrice.class))).thenAnswer(i -> i.getArgument(0));

        ProductTierPriceDTO dto = new ProductTierPriceDTO();
        dto.setMinimumQuantity(10);
        dto.setUnitPrice(new BigDecimal("17.991")); // 3 Nachkommastellen
        dto.setActive(true);
        dto.setSortOrder(10);

        // Act
        ProductTierPriceDTO result = tierPriceService.updateTierPrice(3L, dto);

        // Assert
        ArgumentCaptor<ProductTierPrice> captor = ArgumentCaptor.forClass(ProductTierPrice.class);
        verify(tierPriceRepository).save(captor.capture());

        ProductTierPrice saved = captor.getValue();
        assertEquals(new BigDecimal("17.99"), saved.getUnitPrice()); // Auf 2 Stellen gerundet
        assertEquals(2, saved.getUnitPrice().scale());
        assertEquals(product, saved.getProduct()); // Product unverändert
        assertEquals(3L, saved.getId()); // ID unverändert
    }

    @Test
    void updateTierPrice_shouldPreserveProductRelation() {
        // Arrange
        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(645L);
        product.setStore(store);

        ProductTierPrice existing = new ProductTierPrice();
        existing.setId(3L);
        existing.setProduct(product);
        existing.setMinimumQuantity(10);
        existing.setUnitPrice(new BigDecimal("10.00"));
        existing.setActive(true);
        existing.setSortOrder(10);

        when(tierPriceRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(tierPriceRepository.save(any(ProductTierPrice.class))).thenAnswer(i -> i.getArgument(0));

        ProductTierPriceDTO dto = new ProductTierPriceDTO();
        dto.setMinimumQuantity(15);
        dto.setUnitPrice(new BigDecimal("8.50"));
        dto.setActive(false);
        dto.setSortOrder(15);

        // Act
        tierPriceService.updateTierPrice(3L, dto);

        // Assert
        ArgumentCaptor<ProductTierPrice> captor = ArgumentCaptor.forClass(ProductTierPrice.class);
        verify(tierPriceRepository).save(captor.capture());

        ProductTierPrice saved = captor.getValue();
        assertNotNull(saved.getProduct(), "Product must not be null after update");
        assertEquals(645L, saved.getProduct().getId(), "Product ID must remain unchanged");
        assertEquals(121L, saved.getProduct().getStore().getId(), "Store must remain unchanged");
    }

    @Test
    void updateTierPrice_shouldUpdateActiveStatusCorrectly() {
        // Arrange
        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(645L);
        product.setStore(store);

        ProductTierPrice existing = new ProductTierPrice();
        existing.setId(3L);
        existing.setProduct(product);
        existing.setMinimumQuantity(10);
        existing.setUnitPrice(new BigDecimal("10.00"));
        existing.setActive(true);
        existing.setSortOrder(10);

        when(tierPriceRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(tierPriceRepository.save(any(ProductTierPrice.class))).thenAnswer(i -> i.getArgument(0));

        ProductTierPriceDTO dto = new ProductTierPriceDTO();
        dto.setMinimumQuantity(10);
        dto.setUnitPrice(new BigDecimal("10.00"));
        dto.setActive(false); // Toggle to false
        dto.setSortOrder(10);

        // Act
        tierPriceService.updateTierPrice(3L, dto);

        // Assert
        ArgumentCaptor<ProductTierPrice> captor = ArgumentCaptor.forClass(ProductTierPrice.class);
        verify(tierPriceRepository).save(captor.capture());

        ProductTierPrice saved = captor.getValue();
        assertFalse(saved.getActive(), "Active status should be updated to false");
    }

    @Test
    void updateTierPrice_shouldThrowIllegalArgumentExceptionForInvalidQuantity() {
        // Arrange
        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(645L);
        product.setStore(store);

        ProductTierPrice existing = new ProductTierPrice();
        existing.setId(3L);
        existing.setProduct(product);
        existing.setMinimumQuantity(10);
        existing.setUnitPrice(new BigDecimal("10.00"));

        when(tierPriceRepository.findById(3L)).thenReturn(Optional.of(existing));

        ProductTierPriceDTO dto = new ProductTierPriceDTO();
        dto.setMinimumQuantity(1); // Invalid: must be > 1
        dto.setUnitPrice(new BigDecimal("10.00"));

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            tierPriceService.updateTierPrice(3L, dto);
        });

        assertTrue(exception.getMessage().contains("Minimum quantity must be greater than 1"));
        verify(tierPriceRepository, never()).save(any());
    }

    @Test
    void updateTierPrice_shouldThrowIllegalArgumentExceptionForNegativePrice() {
        // Arrange
        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(645L);
        product.setStore(store);

        ProductTierPrice existing = new ProductTierPrice();
        existing.setId(3L);
        existing.setProduct(product);
        existing.setMinimumQuantity(10);
        existing.setUnitPrice(new BigDecimal("10.00"));

        when(tierPriceRepository.findById(3L)).thenReturn(Optional.of(existing));

        ProductTierPriceDTO dto = new ProductTierPriceDTO();
        dto.setMinimumQuantity(10);
        dto.setUnitPrice(new BigDecimal("-5.00")); // Negative price

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            tierPriceService.updateTierPrice(3L, dto);
        });

        assertTrue(exception.getMessage().contains("Unit price cannot be negative"));
        verify(tierPriceRepository, never()).save(any());
    }

    @Test
    void updateTierPrice_shouldThrowIllegalStateExceptionForDuplicateQuantity() {
        // Arrange
        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(645L);
        product.setStore(store);

        ProductTierPrice existing = new ProductTierPrice();
        existing.setId(3L);
        existing.setProduct(product);
        existing.setMinimumQuantity(10);
        existing.setUnitPrice(new BigDecimal("10.00"));

        when(tierPriceRepository.findById(3L)).thenReturn(Optional.of(existing));
        when(tierPriceRepository.existsByProductIdAndMinimumQuantity(645L, 20)).thenReturn(true);

        ProductTierPriceDTO dto = new ProductTierPriceDTO();
        dto.setMinimumQuantity(20); // Duplicate
        dto.setUnitPrice(new BigDecimal("8.00"));

        // Act & Assert
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> {
            tierPriceService.updateTierPrice(3L, dto);
        });

        assertTrue(exception.getMessage().contains("already exists"));
        verify(tierPriceRepository, never()).save(any());
    }

    @Test
    void updateTierPrice_shouldThrowIllegalArgumentExceptionForLongLabel() {
        // Arrange
        Store store = new Store();
        store.setId(121L);

        Product product = new Product();
        product.setId(645L);
        product.setStore(store);

        ProductTierPrice existing = new ProductTierPrice();
        existing.setId(3L);
        existing.setProduct(product);
        existing.setMinimumQuantity(10);
        existing.setUnitPrice(new BigDecimal("10.00"));

        when(tierPriceRepository.findById(3L)).thenReturn(Optional.of(existing));

        ProductTierPriceDTO dto = new ProductTierPriceDTO();
        dto.setMinimumQuantity(10);
        dto.setUnitPrice(new BigDecimal("10.00"));
        dto.setLabel("A".repeat(101)); // 101 characters (max is 100)

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            tierPriceService.updateTierPrice(3L, dto);
        });

        assertTrue(exception.getMessage().contains("Label cannot exceed 100 characters"));
        verify(tierPriceRepository, never()).save(any());
    }
}

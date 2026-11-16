package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.entity.InventoryLog;
import storebackend.entity.Product;
import storebackend.entity.ProductVariant;
import storebackend.entity.SharedProductStock;
import storebackend.repository.InventoryLogRepository;
import storebackend.repository.ProductVariantRepository;
import storebackend.repository.SharedProductStockRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryServiceSharedStockTest {
    private final InventoryLogRepository logs = mock(InventoryLogRepository.class);
    private final ProductVariantRepository variants = mock(ProductVariantRepository.class);
    private final SharedProductStockService shared = mock(SharedProductStockService.class);
    private final SharedProductStockRepository stocks = mock(SharedProductStockRepository.class);
    private final InventoryService service = new InventoryService(logs, variants, shared, stocks);

    private void givenCarton(boolean enabled) {
        Product product = new Product();
        product.setId(645L);
        ProductVariant carton = new ProductVariant();
        carton.setId(8L);
        carton.setProduct(product);
        carton.setStockQuantity(200);
        carton.setBaseUnitFactor(new BigDecimal("40"));
        when(variants.findById(8L)).thenReturn(Optional.of(carton));
        SharedProductStock stock = new SharedProductStock();
        stock.setEnabled(enabled);
        when(stocks.findByProductId(645L)).thenReturn(Optional.of(stock));
        when(logs.save(any(InventoryLog.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void enabledSharedStockUsesBaseUnitConversionWithoutChangingVariantStock() {
        givenCarton(true);
        service.adjustInventory(8L, -2, "SALE", "Order 123", null);
        verify(shared).adjustSaleUnits(645L, -2, new BigDecimal("40"));
        verify(variants, never()).save(any());
    }

    @Test
    void disabledSharedStockKeepsLegacyVariantStock() {
        givenCarton(false);
        service.adjustInventory(8L, -2, "SALE", "Order 123", null);
        verifyNoInteractions(shared);
        verify(variants).save(argThat(v -> v.getStockQuantity() == 198));
    }

    @Test
    void sharedStockFailureDoesNotWriteInventoryLog() {
        givenCarton(true);
        doThrow(new IllegalStateException("Insufficient shared stock"))
                .when(shared).adjustSaleUnits(645L, -2, new BigDecimal("40"));
        assertThrows(IllegalStateException.class,
                () -> service.adjustInventory(8L, -2, "SALE", "Order 123", null));
        verify(logs, never()).save(any());
    }
}

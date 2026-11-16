package storebackend.controller;

import org.junit.jupiter.api.Test;
import storebackend.dto.SharedStockStatusDTO;
import storebackend.entity.Product;
import storebackend.entity.ProductVariant;
import storebackend.entity.SharedProductStock;
import storebackend.entity.Store;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductVariantRepository;
import storebackend.repository.SharedProductStockRepository;
import storebackend.util.StoreAccessChecker;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SharedStockControllerTest {
    private final StoreAccessChecker access = mock(StoreAccessChecker.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final ProductVariantRepository variants = mock(ProductVariantRepository.class);
    private final SharedProductStockRepository stock = mock(SharedProductStockRepository.class);
    private final storebackend.service.SharedProductStockService sharedStockService = mock(storebackend.service.SharedProductStockService.class);
    private final SharedStockController controller = new SharedStockController(access, products, variants, stock, sharedStockService);

    @Test
    void deniesOtherStoresBeforeReadingProducts() {
        when(access.hasStoreAccess(121L)).thenReturn(false);
        assertEquals(403, controller.getStatus(121L, 645L).getStatusCode().value());
        verifyNoInteractions(products, variants, stock);
    }

    @Test
    void doesNotLeakProductFromAnotherStore() {
        when(access.hasStoreAccess(121L)).thenReturn(true);
        Store otherStore = new Store();
        otherStore.setId(122L);
        Product product = new Product();
        product.setStore(otherStore);
        when(products.findById(645L)).thenReturn(Optional.of(product));
        assertEquals(404, controller.getStatus(121L, 645L).getStatusCode().value());
        verifyNoInteractions(variants, stock);
    }

    @Test
    void calculatesCartonAvailabilityOnlyForEnabledSharedStock() {
        when(access.hasStoreAccess(121L)).thenReturn(true);
        Store store = new Store();
        store.setId(121L);
        Product product = new Product();
        product.setStore(store);
        when(products.findById(645L)).thenReturn(Optional.of(product));

        ProductVariant carton = new ProductVariant();
        carton.setId(8L);
        carton.setSku("CARTON-10");
        carton.setSaleUnit("Karton");
        carton.setBaseUnitFactor(new BigDecimal("10"));
        when(variants.findByProductId(645L)).thenReturn(List.of(carton));

        SharedProductStock shared = new SharedProductStock();
        shared.setEnabled(true);
        shared.setBaseStock(997);
        when(stock.findByProductId(645L)).thenReturn(Optional.of(shared));

        SharedStockStatusDTO response = controller.getStatus(121L, 645L).getBody();
        assertNotNull(response);
        assertEquals(997, response.baseStock());
        assertEquals(99, response.units().get(0).available());

        shared.setEnabled(false);
        response = controller.getStatus(121L, 645L).getBody();
        assertNotNull(response);
        assertNull(response.units().get(0).available());
    }
}

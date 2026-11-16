package storebackend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.dto.ProductVariantDTO;
import storebackend.entity.Product;
import storebackend.entity.ProductVariant;
import storebackend.entity.Store;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductVariantRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductVariantSaleUnitTest {
    @Mock ProductVariantRepository variantRepository;
    @Mock ProductRepository productRepository;
    @Mock ObjectMapper objectMapper;
    @InjectMocks ProductVariantService service;

    @Test
    void createsConfigurableCartonWithoutChangingLegacyQuantity() {
        Store store = new Store();
        Product product = new Product();
        product.setId(721L);
        when(productRepository.findByIdAndStore(721L, store)).thenReturn(Optional.of(product));
        when(variantRepository.save(any(ProductVariant.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductVariantDTO request = new ProductVariantDTO();
        request.setSku("TEST-CARTON-40");
        request.setPrice(new BigDecimal("80.00"));
        request.setQuantity(0);
        request.setSaleUnit("CARTON");
        request.setBaseUnitFactor(new BigDecimal("40"));

        ProductVariantDTO result = service.createVariant(721L, store, request);
        assertEquals("CARTON", result.getSaleUnit());
        assertEquals(0, result.getBaseUnitFactor().compareTo(new BigDecimal("40")));
        assertEquals(0, result.getQuantity());
        verify(variantRepository).save(any(ProductVariant.class));
    }

    @Test
    void rejectsZeroOrNegativeConversionFactor() {
        Store store = new Store();
        Product product = new Product();
        when(productRepository.findByIdAndStore(721L, store)).thenReturn(Optional.of(product));

        ProductVariantDTO request = new ProductVariantDTO();
        request.setSaleUnit("PACK");
        request.setBaseUnitFactor(BigDecimal.ZERO);
        assertThrows(IllegalArgumentException.class, () -> service.createVariant(721L, store, request));
        verify(variantRepository, never()).save(any(ProductVariant.class));
    }
}

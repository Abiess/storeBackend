package storebackend.service;

import org.junit.jupiter.api.Test;
import storebackend.entity.SharedProductStock;
import storebackend.repository.ProductRepository;
import storebackend.repository.SharedProductStockRepository;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class SharedProductStockServiceTest {
    private final SharedProductStockRepository repository = mock(SharedProductStockRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final SharedProductStockService service = new SharedProductStockService(repository, products);

    @Test
    void sellingTwoCartonsOfFortyReducesBaseStockByEighty() {
        SharedProductStock stock = new SharedProductStock();
        stock.setEnabled(true);
        stock.setBaseStock(1000);
        when(repository.lockByProductId(645L)).thenReturn(Optional.of(stock));
        assertEquals(920, service.adjustSaleUnits(645L, -2, new BigDecimal("40")));
        verify(repository).save(stock);
    }

    @Test
    void insufficientSharedStockCannotGoNegative() {
        SharedProductStock stock = new SharedProductStock();
        stock.setEnabled(true);
        stock.setBaseStock(30);
        when(repository.lockByProductId(645L)).thenReturn(Optional.of(stock));
        assertThrows(IllegalStateException.class,
                () -> service.adjustSaleUnits(645L, -2, new BigDecimal("40")));
        verify(repository, never()).save(any());
    }

    @Test
    void disabledSharedStockCannotBeAdjusted() {
        SharedProductStock stock = new SharedProductStock();
        stock.setEnabled(false);
        stock.setBaseStock(1000);
        when(repository.lockByProductId(645L)).thenReturn(Optional.of(stock));
        assertThrows(IllegalStateException.class,
                () -> service.adjustSaleUnits(645L, -1, BigDecimal.TEN));
        verify(repository, never()).save(any());
    }

    @Test
    void fractionalBaseUnitAdjustmentsAreRejected() {
        assertThrows(ArithmeticException.class,
                () -> service.adjustSaleUnits(645L, -1, new BigDecimal("1.5")));
        verifyNoInteractions(repository);
    }
}

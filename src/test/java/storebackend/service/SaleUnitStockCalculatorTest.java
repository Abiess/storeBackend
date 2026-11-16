package storebackend.service;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class SaleUnitStockCalculatorTest {
    @Test void convertsCartons() {
        assertEquals(20, SaleUnitStockCalculator.baseUnitsForSale(2, new BigDecimal("10")));
    }
    @Test void showsOnlyCompleteCartons() {
        assertEquals(99, SaleUnitStockCalculator.availableSaleUnits(997, new BigDecimal("10")));
    }
    @Test void preservesPieceBehavior() {
        assertEquals(3, SaleUnitStockCalculator.baseUnitsForSale(3, BigDecimal.ONE));
    }
    @Test void rejectsFractionalPieceConsumption() {
        assertThrows(ArithmeticException.class, () -> SaleUnitStockCalculator.baseUnitsForSale(1, new BigDecimal("1.5")));
    }
    @Test void rejectsInvalidFactorAndOverflow() {
        assertThrows(IllegalArgumentException.class, () -> SaleUnitStockCalculator.availableSaleUnits(100, BigDecimal.ZERO));
        assertThrows(ArithmeticException.class, () -> SaleUnitStockCalculator.baseUnitsForSale(Integer.MAX_VALUE, new BigDecimal("10")));
    }
}

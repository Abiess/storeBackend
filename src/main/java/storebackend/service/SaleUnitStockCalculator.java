package storebackend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Pure conversion helper; does not change inventory or activate shared stock. */
public final class SaleUnitStockCalculator {
    private SaleUnitStockCalculator() {}

    public static int baseUnitsForSale(int quantity, BigDecimal factor) {
        if (quantity < 0 || factor == null || factor.signum() <= 0)
            throw new IllegalArgumentException("Invalid quantity or conversion factor");
        return factor.multiply(BigDecimal.valueOf(quantity))
                .setScale(0, RoundingMode.UNNECESSARY).intValueExact();
    }

    public static int availableSaleUnits(int baseStock, BigDecimal factor) {
        if (baseStock < 0 || factor == null || factor.signum() <= 0)
            throw new IllegalArgumentException("Invalid stock or conversion factor");
        return BigDecimal.valueOf(baseStock).divide(factor, 0, RoundingMode.DOWN).intValueExact();
    }
}

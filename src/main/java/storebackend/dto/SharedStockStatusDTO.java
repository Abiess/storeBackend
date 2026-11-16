package storebackend.dto;

import java.util.List;

public record SharedStockStatusDTO(boolean configured, boolean enabled, Integer baseStock, List<UnitAvailability> units) {
    public record UnitAvailability(Long variantId, String sku, String saleUnit, java.math.BigDecimal factor, Integer available) {}
}

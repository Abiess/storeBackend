package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.SharedStockStatusDTO;
import storebackend.entity.SharedProductStock;
import storebackend.entity.ProductVariant;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductVariantRepository;
import storebackend.repository.SharedProductStockRepository;
import storebackend.service.SaleUnitStockCalculator;
import storebackend.util.StoreAccessChecker;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/stores/{storeId}/products/{productId}/shared-stock")
@RequiredArgsConstructor
public class SharedStockController {
    private final StoreAccessChecker storeAccessChecker;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final SharedProductStockRepository stockRepository;
    private final storebackend.service.SharedProductStockService sharedStockService;

    public record ConfigureStockRequest(Integer baseStock) {}

    /** Configure only; does not enable shared stock or modify variant inventory. */
    @PostMapping("/configure")
    @storebackend.security.RequiresApp(storebackend.enums.AppKey.SHOP)
    public ResponseEntity<SharedStockStatusDTO> configure(@PathVariable Long storeId,
            @PathVariable Long productId, @RequestBody ConfigureStockRequest request) {
        if (!storeAccessChecker.hasStoreAccess(storeId)) {
            return ResponseEntity.status(403).build();
        }
        var product = productRepository.findById(productId).orElse(null);
        if (product == null || !product.getStore().getId().equals(storeId)) {
            return ResponseEntity.notFound().build();
        }
        if (request == null || request.baseStock() == null || request.baseStock() < 0) {
            return ResponseEntity.badRequest().build();
        }
        try {
            sharedStockService.configureDisabledStock(product, request.baseStock());
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(409).build();
        }
        return getStatus(storeId, productId);
    }

    /** Read-only preview; never activates shared inventory or changes variant stock. */
    @GetMapping
    public ResponseEntity<SharedStockStatusDTO> getStatus(@PathVariable Long storeId, @PathVariable Long productId) {
        if (!storeAccessChecker.hasStoreAccess(storeId)) {
            return ResponseEntity.status(403).build();
        }
        var product = productRepository.findById(productId).orElse(null);
        if (product == null || !product.getStore().getId().equals(storeId)) {
            return ResponseEntity.notFound().build();
        }
        var configured = stockRepository.findByProductId(productId);
        boolean enabled = configured.map(SharedProductStock::getEnabled).orElse(false);
        Integer baseStock = configured.map(SharedProductStock::getBaseStock).orElse(null);
        List<SharedStockStatusDTO.UnitAvailability> units = variantRepository.findByProductId(productId).stream()
                .map(v -> unitAvailability(v, enabled ? baseStock : null))
                .toList();
        return ResponseEntity.ok(new SharedStockStatusDTO(configured.isPresent(), enabled, baseStock, units));
    }

    private SharedStockStatusDTO.UnitAvailability unitAvailability(ProductVariant v, Integer stock) {
        BigDecimal factor = v.getBaseUnitFactor() == null ? BigDecimal.ONE : v.getBaseUnitFactor();
        Integer available = null;
        if (stock != null && factor.signum() > 0) {
            available = SaleUnitStockCalculator.availableSaleUnits(stock, factor);
        }
        return new SharedStockStatusDTO.UnitAvailability(v.getId(), v.getSku(), v.getSaleUnit(), factor, available);
    }
}

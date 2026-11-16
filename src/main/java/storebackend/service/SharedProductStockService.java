package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.SharedProductStock;
import storebackend.repository.SharedProductStockRepository;

/**
 * Internal opt-in stock operations. Not wired into checkout or public endpoints yet.
 * Existing variant stock remains authoritative until explicit activation.
 */
@Service
@RequiredArgsConstructor
public class SharedProductStockService {
    private final SharedProductStockRepository repository;
    private final storebackend.repository.ProductRepository productRepository;

    /**
     * Configure the base stock without activating shared inventory.
     * The existing variant quantities remain untouched until a later rollout.
     */
    @Transactional
    public int configureDisabledStock(storebackend.entity.Product product, int baseStock) {
        if (baseStock < 0) {
            throw new IllegalArgumentException("Base stock must not be negative");
        }
        // Lock the parent product row to serialize first-time creation as well.
        storebackend.entity.Product lockedProduct = productRepository.findByIdForUpdate(product.getId())
                .orElseThrow(() -> new IllegalStateException("Product not found"));
        SharedProductStock stock = repository.findByProductId(lockedProduct.getId())
                .orElseGet(() -> {
                    SharedProductStock created = new SharedProductStock();
                    created.setProduct(lockedProduct);
                    created.setEnabled(false);
                    return created;
                });
        if (Boolean.TRUE.equals(stock.getEnabled())) {
            throw new IllegalStateException("Cannot reconfigure active shared stock");
        }
        stock.setBaseStock(baseStock);
        stock.setUpdatedAt(java.time.LocalDateTime.now());
        repository.save(stock);
        return baseStock;
    }

    @Transactional
    public int adjustEnabledStock(Long productId, int baseUnitDelta) {
        SharedProductStock stock = repository.lockByProductId(productId)
                .orElseThrow(() -> new IllegalStateException("Shared stock not configured"));
        if (!Boolean.TRUE.equals(stock.getEnabled())) {
            throw new IllegalStateException("Shared stock not enabled");
        }
        int next = Math.addExact(stock.getBaseStock(), baseUnitDelta);
        if (next < 0) {
            throw new IllegalStateException("Insufficient shared stock");
        }
        stock.setBaseStock(next);
        stock.setUpdatedAt(java.time.LocalDateTime.now());
        repository.save(stock);
        return next;
    }
}

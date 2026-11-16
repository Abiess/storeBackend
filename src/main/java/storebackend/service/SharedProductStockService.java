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

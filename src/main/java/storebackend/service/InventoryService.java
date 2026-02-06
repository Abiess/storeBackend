package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.InventoryLog;
import storebackend.entity.ProductVariant;
import storebackend.entity.User;
import storebackend.repository.InventoryLogRepository;
import storebackend.repository.ProductVariantRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryService {
    private final InventoryLogRepository inventoryLogRepository;
    private final ProductVariantRepository productVariantRepository;

    @Transactional(readOnly = true)
    public List<InventoryLog> getInventoryLogsByVariant(Long variantId) {
        return inventoryLogRepository.findByVariantIdOrderByLoggedAtDesc(variantId);
    }

    @Transactional(readOnly = true)
    public List<InventoryLog> getInventoryLogsByStore(Long storeId) {
        return inventoryLogRepository.findByVariant_Product_Store_IdOrderByLoggedAtDesc(storeId);
    }

    @Transactional
    public InventoryLog adjustInventory(Long variantId, Integer quantityChange, String reason, String notes, User user) {
        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));

        // Update variant stock
        int newQuantity = variant.getStockQuantity() + quantityChange;
        if (newQuantity < 0) {
            throw new RuntimeException("Insufficient stock. Current: " + variant.getStockQuantity() + ", Change: " + quantityChange);
        }
        variant.setStockQuantity(newQuantity);
        productVariantRepository.save(variant);

        // Create inventory log
        InventoryLog log = new InventoryLog();
        log.setVariant(variant);
        log.setQuantityChange(quantityChange);
        log.setReason(reason);
        log.setNotes(notes);
        log.setUser(user);

        return inventoryLogRepository.save(log);
    }
}

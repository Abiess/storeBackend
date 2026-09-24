package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.InventoryLog;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.entity.ProductVariant;
import storebackend.entity.User;
import storebackend.repository.InventoryLogRepository;
import storebackend.repository.ProductVariantRepository;

import java.util.List;

@Service
@Slf4j
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
    
    /**
     * Reduziert Bestand für alle Items einer Order
     * Wird nach erfolgreicher Zahlung aufgerufen
     * 
     * @param order Die Order für die Bestand reduziert werden soll
     */
    @Transactional
    public void adjustForOrder(Order order) {
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            log.warn("No order items found for order {}", order.getId());
            return;
        }
        
        for (OrderItem item : order.getOrderItems()) {
            if (item.getVariant() == null) {
                log.warn("Order item {} has no variant, skipping inventory adjustment", item.getId());
                continue;
            }
            
            Long variantId = item.getVariant().getId();
            int quantityChange = -item.getQuantity(); // Negativ = Bestand reduzieren
            String reason = "ORDER_CONFIRMED";
            String notes = "Order #" + order.getOrderNumber() + " confirmed";
            
            try {
                adjustInventory(variantId, quantityChange, reason, notes, null);
                log.info("Inventory adjusted: variantId={}, quantity={}, order={}", 
                    variantId, quantityChange, order.getOrderNumber());
            } catch (Exception e) {
                log.error("Failed to adjust inventory for variant {} in order {}: {}", 
                    variantId, order.getOrderNumber(), e.getMessage());
                throw new RuntimeException("Failed to adjust inventory for order " + order.getOrderNumber(), e);
            }
        }
    }
}

package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.DropshippingSourceDTO;
import storebackend.dto.FulfillmentUpdateRequest;
import storebackend.entity.*;
import storebackend.enums.FulfillmentStatus;
import storebackend.repository.DropshippingSourceRepository;
import storebackend.repository.OrderItemRepository;
import storebackend.repository.ProductVariantRepository;
import storebackend.repository.StoreRepository;

import java.math.BigDecimal;
import java.net.MalformedURLException;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service für Dropshipping-Funktionen (ROLE_RESELLER)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DropshippingService {

    private final DropshippingSourceRepository dropshippingSourceRepository;
    private final ProductVariantRepository productVariantRepository;
    private final OrderItemRepository orderItemRepository;
    private final StoreRepository storeRepository;

    /**
     * Speichert oder aktualisiert Supplier-Link für eine Variant
     * Nur Store Owner kann seine eigenen Variants bearbeiten
     */
    @Transactional
    public DropshippingSourceDTO saveSupplierLink(Long variantId, DropshippingSourceDTO dto, User user) {
        log.info("Saving dropshipping source for variant {} by user {}", variantId, user.getEmail());

        // Validierung
        validateSupplierUrl(dto.supplierUrl());
        validatePurchasePrice(dto.purchasePrice());

        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        // Sicherheit: Prüfe ob User Owner des Stores ist
        Store store = variant.getProduct().getStore();
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You don't own this store");
        }

        // Existierende Source laden oder neu erstellen
        DropshippingSource source = dropshippingSourceRepository.findByVariantId(variantId)
                .orElse(new DropshippingSource());

        // Update Felder
        source.setVariant(variant);
        source.setSupplierType(dto.supplierType() != null ? dto.supplierType() : storebackend.enums.SupplierType.MANUAL);
        source.setSupplierUrl(dto.supplierUrl());
        source.setSupplierName(dto.supplierName());
        source.setPurchasePrice(dto.purchasePrice());
        source.setEstimatedShippingDays(dto.estimatedShippingDays());
        source.setSupplierSku(dto.supplierSku());
        source.setCjProductId(dto.cjProductId());
        source.setCjVariantId(dto.cjVariantId());
        source.setNotes(dto.notes());
        source.setCreatedBy(user);

        source = dropshippingSourceRepository.save(source);

        log.info("✅ Saved dropshipping source {} for variant {} (type: {})",
                 source.getId(), variantId, source.getSupplierType());

        return toDTOWithCalculations(source, variant.getPrice());
    }

    /**
     * Lädt Supplier-Link für eine Variant
     */
    @Transactional(readOnly = true)
    public DropshippingSourceDTO getSupplierLink(Long variantId, User user) {
        log.info("Loading dropshipping source for variant {} by user {}", variantId, user.getEmail());

        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        // Sicherheit: Prüfe Ownership
        Store store = variant.getProduct().getStore();
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You don't own this store");
        }

        DropshippingSource source = dropshippingSourceRepository.findByVariantId(variantId)
                .orElse(null);

        if (source == null) {
            return null; // Keine Dropshipping Source vorhanden
        }

        return toDTOWithCalculations(source, variant.getPrice());
    }

    /**
     * Löscht Supplier-Link für eine Variant
     */
    @Transactional
    public void deleteSupplierLink(Long variantId, User user) {
        log.info("Deleting dropshipping source for variant {} by user {}", variantId, user.getEmail());

        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        // Sicherheit: Prüfe Ownership
        Store store = variant.getProduct().getStore();
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You don't own this store");
        }

        dropshippingSourceRepository.deleteByVariantId(variantId);
        log.info("✅ Deleted dropshipping source for variant {}", variantId);
    }

    /**
     * Findet alle Dropshipping Sources für ein Product
     */
    @Transactional(readOnly = true)
    public List<DropshippingSourceDTO> getSupplierLinksForProduct(Long productId, User user) {
        log.info("Loading dropshipping sources for product {} by user {}", productId, user.getEmail());

        List<DropshippingSource> sources = dropshippingSourceRepository.findByProductId(productId);

        // Security Check für ersten Source (alle gehören zum selben Store)
        if (!sources.isEmpty()) {
            Store store = sources.get(0).getVariant().getProduct().getStore();
            if (!store.getOwner().getId().equals(user.getId())) {
                throw new RuntimeException("Unauthorized: You don't own this store");
            }
        }

        return sources.stream()
                .map(source -> toDTOWithCalculations(source, source.getVariant().getPrice()))
                .toList();
    }

    /**
     * Findet alle Dropshipping Sources für einen Store (für Dashboard)
     */
    @Transactional(readOnly = true)
    public List<DropshippingSourceDTO> getSupplierLinksForStore(Long storeId, User user) {
        log.info("Loading dropshipping sources for store {} by user {}", storeId, user.getEmail());

        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You don't own this store");
        }

        List<DropshippingSource> sources = dropshippingSourceRepository.findByStoreId(storeId);

        return sources.stream()
                .map(source -> toDTOWithCalculations(source, source.getVariant().getPrice()))
                .toList();
    }

    /**
     * Updated Fulfillment Status für ein OrderItem
     * Nur Store Owner kann Fulfillment aktualisieren
     */
    @Transactional
    public void updateFulfillment(Long orderItemId, FulfillmentUpdateRequest request, User user) {
        log.info("Updating fulfillment for order item {} by user {}", orderItemId, user.getEmail());

        if (!request.isValid()) {
            throw new IllegalArgumentException("Invalid fulfillment update: status is required");
        }

        OrderItem item = orderItemRepository.findById(orderItemId)
                .orElseThrow(() -> new RuntimeException("Order item not found"));

        // Sicherheit: Prüfe Store Ownership
        Store store = item.getOrder().getStore();
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You don't own this store");
        }

        // Update Fulfillment-Felder
        item.setFulfillmentStatus(request.status());

        if (request.supplierOrderId() != null) {
            item.setSupplierOrderId(request.supplierOrderId());
        }

        if (request.trackingNumber() != null) {
            item.setSupplierTrackingNumber(request.trackingNumber());
        }

        if (request.carrier() != null) {
            item.setSupplierCarrier(request.carrier());
        }

        if (request.notes() != null) {
            item.setFulfillmentNotes(request.notes());
        }

        // Setze Timestamps basierend auf Status
        if (request.status() == FulfillmentStatus.ORDERED && item.getOrderedFromSupplierAt() == null) {
            item.setOrderedFromSupplierAt(LocalDateTime.now());
        }

        if (request.status() == FulfillmentStatus.DELIVERED && item.getFulfilledAt() == null) {
            item.setFulfilledAt(LocalDateTime.now());
        }

        orderItemRepository.save(item);

        log.info("✅ Updated fulfillment for order item {} to status {}", orderItemId, request.status());
    }

    /**
     * Lädt Order Items mit Dropshipping Info für eine Order
     */
    @Transactional(readOnly = true)
    public List<OrderItemWithDropshippingDTO> getOrderItemsWithDropshipping(Long orderId, User user) {
        log.info("Loading order items with dropshipping info for order {} by user {}", orderId, user.getEmail());

        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);

        if (items.isEmpty()) {
            return List.of();
        }

        // Security Check
        Store store = items.get(0).getOrder().getStore();
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized: You don't own this store");
        }

        return items.stream()
                .map(this::toOrderItemWithDropshippingDTO)
                .toList();
    }

    /**
     * Berechnet Gesamt-Marge für einen Store
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalMargin(Long storeId, User user) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        List<DropshippingSource> sources = dropshippingSourceRepository.findByStoreId(storeId);

        BigDecimal totalProfit = sources.stream()
                .map(source -> source.calculateProfit(source.getVariant().getPrice()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalRevenue = sources.stream()
                .map(source -> source.getVariant().getPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalRevenue.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }

        return totalProfit.divide(totalRevenue, 4, java.math.RoundingMode.HALF_UP);
    }

    // ==================================================================================
    // PRIVATE HELPERS
    // ==================================================================================

    private void validateSupplierUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("Supplier URL is required");
        }

        try {
            URL parsedUrl = new URL(url);
            String protocol = parsedUrl.getProtocol();
            if (!protocol.equals("http") && !protocol.equals("https")) {
                throw new IllegalArgumentException("Supplier URL must be http or https");
            }
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Invalid supplier URL format: " + e.getMessage());
        }
    }

    private void validatePurchasePrice(BigDecimal price) {
        if (price == null) {
            throw new IllegalArgumentException("Purchase price is required");
        }

        if (price.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Purchase price must be >= 0");
        }
    }

    private DropshippingSourceDTO toDTOWithCalculations(DropshippingSource source, BigDecimal salePrice) {
        DropshippingSourceDTO base = new DropshippingSourceDTO(
                source.getId(),
                source.getVariant().getId(),
                source.getSupplierType(),
                source.getSupplierUrl(),
                source.getSupplierName(),
                source.getPurchasePrice(),
                source.getEstimatedShippingDays(),
                source.getSupplierSku(),
                source.getCjProductId(),
                source.getCjVariantId(),
                source.getNotes()
        );

        return DropshippingSourceDTO.withCalculations(base, salePrice);
    }

    private OrderItemWithDropshippingDTO toOrderItemWithDropshippingDTO(OrderItem item) {
        DropshippingSourceDTO dropshippingInfo = null;

        if (item.getVariant() != null) {
            var source = dropshippingSourceRepository.findByVariantId(item.getVariant().getId())
                    .orElse(null);

            if (source != null) {
                dropshippingInfo = toDTOWithCalculations(source, item.getPrice());
            }
        }

        return new OrderItemWithDropshippingDTO(
                item.getId(),
                item.getName(),
                item.getVariantTitle(),
                item.getQuantity(),
                item.getPrice(),
                item.getTotal(),
                item.getFulfillmentStatus(),
                item.getSupplierOrderId(),
                item.getSupplierTrackingNumber(),
                item.getSupplierCarrier(),
                item.getOrderedFromSupplierAt(),
                item.getFulfilledAt(),
                item.getFulfillmentNotes(),
                dropshippingInfo
        );
    }

    /**
     * DTO für OrderItem mit Dropshipping-Info
     */
    public record OrderItemWithDropshippingDTO(
            Long id,
            String name,
            String variantTitle,
            Integer quantity,
            BigDecimal price,
            BigDecimal total,
            FulfillmentStatus fulfillmentStatus,
            String supplierOrderId,
            String trackingNumber,
            String carrier,
            LocalDateTime orderedFromSupplierAt,
            LocalDateTime fulfilledAt,
            String notes,
            DropshippingSourceDTO dropshippingSource
    ) {
        public boolean isDropshipping() {
            return dropshippingSource != null;
        }

        public boolean needsOrdering() {
            return isDropshipping() && fulfillmentStatus == FulfillmentStatus.PENDING;
        }
    }
}


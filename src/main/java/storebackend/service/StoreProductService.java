package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ImportProductRequest;
import storebackend.dto.StoreProductDTO;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.entity.StoreProduct;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreProductRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing store products (reseller imports supplier products).
 */
@Service
@RequiredArgsConstructor
public class StoreProductService {

    private final StoreProductRepository storeProductRepository;
    private final ProductRepository productRepository;
    private final PlatformSettingsService platformSettingsService;

    /**
     * Import a supplier product into a reseller's store.
     * Reseller sets their own retail price.
     */
    @Transactional
    public StoreProductDTO importProductToStore(Store store, ImportProductRequest request) {
        // 1. Validate supplier product exists
        Product supplierProduct = productRepository.findById(request.getSupplierProductId())
                .orElseThrow(() -> new RuntimeException("Supplier product not found"));

        if (!Boolean.TRUE.equals(supplierProduct.getIsSupplierCatalog())) {
            throw new RuntimeException("Product is not a supplier catalog product");
        }

        // 2. Check if already imported
        if (storeProductRepository.existsByStoreAndSupplierProduct(store, supplierProduct)) {
            throw new RuntimeException("Product already imported to this store");
        }

        // 3. Calculate pricing
        BigDecimal wholesalePrice = supplierProduct.getWholesalePrice();
        BigDecimal retailPrice = request.getRetailPrice();

        // If no retail price provided, use recommended margin
        if (retailPrice == null) {
            BigDecimal recommendedMargin = platformSettingsService.getRecommendedResellerMargin();
            retailPrice = wholesalePrice.multiply(BigDecimal.ONE.add(recommendedMargin))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        // Validate retail price is higher than wholesale
        if (retailPrice.compareTo(wholesalePrice) <= 0) {
            throw new RuntimeException("Retail price must be higher than wholesale price");
        }

        // Calculate margin percentage
        BigDecimal marginAmount = retailPrice.subtract(wholesalePrice);
        BigDecimal marginPercentage = marginAmount.divide(wholesalePrice, 4, RoundingMode.HALF_UP);

        // 4. Create store product mapping
        StoreProduct storeProduct = new StoreProduct();
        storeProduct.setStore(store);
        storeProduct.setSupplierProduct(supplierProduct);
        storeProduct.setRetailPrice(retailPrice);
        storeProduct.setMarginPercentage(marginPercentage);
        storeProduct.setIsActive(true);

        StoreProduct saved = storeProductRepository.save(storeProduct);

        return toDTO(saved);
    }

    /**
     * Get all imported products for a store.
     */
    public List<StoreProductDTO> getStoreProducts(Store store, Boolean activeOnly) {
        List<StoreProduct> storeProducts = activeOnly
                ? storeProductRepository.findByStoreAndIsActive(store, true)
                : storeProductRepository.findByStore(store);

        return storeProducts.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Update retail price for an imported product.
     */
    @Transactional
    public StoreProductDTO updateRetailPrice(Long storeProductId, Store store, BigDecimal newRetailPrice) {
        StoreProduct storeProduct = storeProductRepository.findById(storeProductId)
                .orElseThrow(() -> new RuntimeException("Store product not found"));

        // Verify ownership
        if (!storeProduct.getStore().getId().equals(store.getId())) {
            throw new RuntimeException("Not authorized");
        }

        BigDecimal wholesalePrice = storeProduct.getSupplierProduct().getWholesalePrice();

        if (newRetailPrice.compareTo(wholesalePrice) <= 0) {
            throw new RuntimeException("Retail price must be higher than wholesale price");
        }

        // Recalculate margin
        BigDecimal marginAmount = newRetailPrice.subtract(wholesalePrice);
        BigDecimal marginPercentage = marginAmount.divide(wholesalePrice, 4, RoundingMode.HALF_UP);

        storeProduct.setRetailPrice(newRetailPrice);
        storeProduct.setMarginPercentage(marginPercentage);

        StoreProduct updated = storeProductRepository.save(storeProduct);
        return toDTO(updated);
    }

    /**
     * Toggle active status of imported product.
     */
    @Transactional
    public StoreProductDTO toggleActive(Long storeProductId, Store store) {
        StoreProduct storeProduct = storeProductRepository.findById(storeProductId)
                .orElseThrow(() -> new RuntimeException("Store product not found"));

        if (!storeProduct.getStore().getId().equals(store.getId())) {
            throw new RuntimeException("Not authorized");
        }

        storeProduct.setIsActive(!storeProduct.getIsActive());
        StoreProduct updated = storeProductRepository.save(storeProduct);

        return toDTO(updated);
    }

    /**
     * Remove imported product from store.
     */
    @Transactional
    public void removeImportedProduct(Long storeProductId, Store store) {
        StoreProduct storeProduct = storeProductRepository.findById(storeProductId)
                .orElseThrow(() -> new RuntimeException("Store product not found"));

        if (!storeProduct.getStore().getId().equals(store.getId())) {
            throw new RuntimeException("Not authorized");
        }

        storeProductRepository.delete(storeProduct);
    }

    // ==================== DTO Conversion ====================

    private StoreProductDTO toDTO(StoreProduct sp) {
        StoreProductDTO dto = new StoreProductDTO();
        dto.setId(sp.getId());
        dto.setStoreId(sp.getStore().getId());
        dto.setSupplierProductId(sp.getSupplierProduct().getId());

        // Product details from supplier
        Product supplierProduct = sp.getSupplierProduct();
        dto.setTitle(supplierProduct.getTitle());
        dto.setDescription(supplierProduct.getDescription());

        // Pricing
        dto.setWholesalePrice(supplierProduct.getWholesalePrice());
        dto.setRetailPrice(sp.getRetailPrice());
        dto.setMarginPercentage(sp.getMarginPercentage());
        dto.setMarginAmount(sp.getRetailPrice().subtract(supplierProduct.getWholesalePrice()));

        // Supplier info
        if (supplierProduct.getSupplier() != null) {
            dto.setSupplierId(supplierProduct.getSupplier().getId());
            dto.setSupplierName(supplierProduct.getSupplier().getName());
        }

        // Status
        dto.setIsActive(sp.getIsActive());
        dto.setImportedAt(sp.getImportedAt());
        dto.setUpdatedAt(sp.getUpdatedAt());

        return dto;
    }
}


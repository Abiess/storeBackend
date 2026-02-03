package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.SupplierProductDTO;
import storebackend.entity.Product;
import storebackend.entity.User;
import storebackend.enums.ProductStatus;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreProductRepository;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing supplier catalog products.
 * Suppliers publish products that resellers can import.
 */
@Service
@RequiredArgsConstructor
public class SupplierProductService {

    private final ProductRepository productRepository;
    private final StoreProductRepository storeProductRepository;

    /**
     * Get all active supplier catalog products (marketplace catalog).
     */
    public List<SupplierProductDTO> getSupplierCatalog() {
        List<Product> products = productRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getIsSupplierCatalog()))
                .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
                .collect(Collectors.toList());
        
        return products.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get supplier's own products.
     */
    public List<SupplierProductDTO> getProductsBySupplier(User supplier) {
        List<Product> products = productRepository.findAll().stream()
                .filter(p -> p.getSupplier() != null && p.getSupplier().getId().equals(supplier.getId()))
                .filter(p -> Boolean.TRUE.equals(p.getIsSupplierCatalog()))
                .collect(Collectors.toList());
        
        return products.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Create a new supplier product.
     */
    @Transactional
    public Product createSupplierProduct(User supplier, Product product) {
        product.setSupplier(supplier);
        product.setIsSupplierCatalog(true);
        product.setStore(null); // Supplier products don't belong to a store
        product.setStatus(ProductStatus.DRAFT);
        
        return productRepository.save(product);
    }

    /**
     * Update supplier product.
     */
    @Transactional
    public Product updateSupplierProduct(Long productId, User supplier, Product updates) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        
        // Verify ownership
        if (!product.getSupplier().getId().equals(supplier.getId())) {
            throw new RuntimeException("Not authorized to update this product");
        }
        
        if (!Boolean.TRUE.equals(product.getIsSupplierCatalog())) {
            throw new RuntimeException("Not a supplier product");
        }
        
        // Update fields
        product.setTitle(updates.getTitle());
        product.setDescription(updates.getDescription());
        product.setWholesalePrice(updates.getWholesalePrice());
        product.setCategory(updates.getCategory());
        
        return productRepository.save(product);
    }

    /**
     * Publish a supplier product (make it available in catalog).
     */
    @Transactional
    public Product publishProduct(Long productId, User supplier) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        
        if (!product.getSupplier().getId().equals(supplier.getId())) {
            throw new RuntimeException("Not authorized");
        }
        
        product.setStatus(ProductStatus.ACTIVE);
        return productRepository.save(product);
    }

    /**
     * Get single supplier product by ID.
     */
    public SupplierProductDTO getSupplierProductById(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        
        if (!Boolean.TRUE.equals(product.getIsSupplierCatalog())) {
            throw new RuntimeException("Not a supplier product");
        }
        
        return toDTO(product);
    }

    // ==================== DTO Conversion ====================

    private SupplierProductDTO toDTO(Product product) {
        SupplierProductDTO dto = new SupplierProductDTO();
        dto.setId(product.getId());
        dto.setTitle(product.getTitle());
        dto.setDescription(product.getDescription());
        dto.setWholesalePrice(product.getWholesalePrice());
        dto.setStatus(product.getStatus().name());
        dto.setIsFeatured(product.getIsFeatured());
        dto.setViewCount(product.getViewCount());
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedAt(product.getUpdatedAt());
        
        if (product.getCategory() != null) {
            dto.setCategoryId(product.getCategory().getId());
            dto.setCategoryName(product.getCategory().getName());
        }
        
        if (product.getSupplier() != null) {
            dto.setSupplierId(product.getSupplier().getId());
            dto.setSupplierName(product.getSupplier().getName());
        }
        
        // Count how many stores imported this product
        Long importCount = storeProductRepository.countActiveImportsByProduct(product.getId());
        dto.setImportCount(importCount);
        
        return dto;
    }
}


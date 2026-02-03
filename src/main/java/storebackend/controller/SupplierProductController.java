package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.SupplierProductDTO;
import storebackend.entity.Product;
import storebackend.entity.User;
import storebackend.service.SupplierProductService;

import java.util.List;

/**
 * REST Controller for supplier product management.
 * Suppliers can publish products to the marketplace catalog.
 */
@RestController
@RequestMapping("/api/supplier/products")
@RequiredArgsConstructor
public class SupplierProductController {

    private final SupplierProductService supplierProductService;

    /**
     * Get all products for the authenticated supplier.
     * GET /api/supplier/products
     */
    @GetMapping
    @PreAuthorize("hasRole('ROLE_SUPPLIER')")
    public ResponseEntity<List<SupplierProductDTO>> getMyProducts(@AuthenticationPrincipal User supplier) {
        List<SupplierProductDTO> products = supplierProductService.getProductsBySupplier(supplier);
        return ResponseEntity.ok(products);
    }

    /**
     * Create a new supplier product.
     * POST /api/supplier/products
     */
    @PostMapping
    @PreAuthorize("hasRole('ROLE_SUPPLIER')")
    public ResponseEntity<Product> createProduct(
            @AuthenticationPrincipal User supplier,
            @RequestBody Product product) {
        Product created = supplierProductService.createSupplierProduct(supplier, product);
        return ResponseEntity.ok(created);
    }

    /**
     * Update a supplier product.
     * PUT /api/supplier/products/{id}
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPPLIER')")
    public ResponseEntity<Product> updateProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal User supplier,
            @RequestBody Product updates) {
        Product updated = supplierProductService.updateSupplierProduct(id, supplier, updates);
        return ResponseEntity.ok(updated);
    }

    /**
     * Publish a product (make it visible in marketplace catalog).
     * POST /api/supplier/products/{id}/publish
     */
    @PostMapping("/{id}/publish")
    @PreAuthorize("hasRole('ROLE_SUPPLIER')")
    public ResponseEntity<Product> publishProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal User supplier) {
        Product published = supplierProductService.publishProduct(id, supplier);
        return ResponseEntity.ok(published);
    }

    /**
     * Get single supplier product details.
     * GET /api/supplier/products/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_SUPPLIER')")
    public ResponseEntity<SupplierProductDTO> getProduct(@PathVariable Long id) {
        SupplierProductDTO product = supplierProductService.getSupplierProductById(id);
        return ResponseEntity.ok(product);
    }
}


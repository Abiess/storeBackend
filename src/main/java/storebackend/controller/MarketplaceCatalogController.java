package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.SupplierProductDTO;
import storebackend.service.SupplierProductService;

import java.util.List;

/**
 * Public API for browsing supplier catalog.
 * Resellers can browse available products to import.
 */
@RestController
@RequestMapping("/api/marketplace/catalog")
@RequiredArgsConstructor
public class MarketplaceCatalogController {

    private final SupplierProductService supplierProductService;

    /**
     * Browse all available supplier products (marketplace catalog).
     * GET /api/marketplace/catalog
     *
     * This endpoint is accessible to resellers browsing products to import.
     */
    @GetMapping
    public ResponseEntity<List<SupplierProductDTO>> getCatalog() {
        List<SupplierProductDTO> catalog = supplierProductService.getSupplierCatalog();
        return ResponseEntity.ok(catalog);
    }

    /**
     * Get single product details from catalog.
     * GET /api/marketplace/catalog/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<SupplierProductDTO> getCatalogProduct(@PathVariable Long id) {
        SupplierProductDTO product = supplierProductService.getSupplierProductById(id);
        return ResponseEntity.ok(product);
    }
}


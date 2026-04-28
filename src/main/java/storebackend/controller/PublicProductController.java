package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ProductDTO;
import storebackend.dto.ProductVariantDTO;
import storebackend.service.ProductService;
import storebackend.service.ProductVariantService;

import java.util.List;

/**
 * Öffentlicher Controller für Featured/Top Products
 * Keine Authentifizierung erforderlich - für Storefront
 */
@RestController
@RequestMapping("/api/public/stores/{storeId}/products")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Public Products", description = "Public product APIs for storefront")
public class PublicProductController {

    private final ProductService productService;
    private final ProductVariantService productVariantService;

    @Operation(summary = "Get featured products", description = "Returns all featured products for a store")
    @GetMapping("/featured")
    public ResponseEntity<List<ProductDTO>> getFeaturedProducts(
            @Parameter(description = "Store ID") @PathVariable Long storeId) {

        log.info("Getting featured products for store {}", storeId);
        List<ProductDTO> products = productService.getFeaturedProducts(storeId);
        log.info("Returning {} featured products", products.size());

        return ResponseEntity.ok(products);
    }

    @Operation(summary = "Get top products", description = "Returns bestselling products")
    @GetMapping("/top")
    public ResponseEntity<List<ProductDTO>> getTopProducts(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Limit (default 10)") @RequestParam(defaultValue = "10") int limit) {

        log.info("Getting top {} products for store {}", limit, storeId);
        List<ProductDTO> products = productService.getTopProducts(storeId, limit);
        log.info("Returning {} top products", products.size());

        return ResponseEntity.ok(products);
    }

    @Operation(summary = "Get trending products", description = "Returns most viewed products")
    @GetMapping("/trending")
    public ResponseEntity<List<ProductDTO>> getTrendingProducts(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Limit (default 10)") @RequestParam(defaultValue = "10") int limit) {

        log.info("Getting trending {} products for store {}", limit, storeId);
        List<ProductDTO> products = productService.getTrendingProducts(storeId, limit);
        log.info("Returning {} trending products", products.size());

        return ResponseEntity.ok(products);
    }

    @Operation(summary = "Get new arrivals", description = "Returns newest products")
    @GetMapping("/new")
    public ResponseEntity<List<ProductDTO>> getNewArrivals(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Limit (default 10)") @RequestParam(defaultValue = "10") int limit) {

        log.info("Getting {} new arrivals for store {}", limit, storeId);
        List<ProductDTO> products = productService.getNewArrivals(storeId, limit);
        log.info("Returning {} new products", products.size());

        return ResponseEntity.ok(products);
    }

    @Operation(summary = "Get product details", description = "Returns single product with variants")
    @GetMapping("/{productId}")
    public ResponseEntity<ProductDTO> getProductDetails(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId) {

        log.info("Getting product {} details for store {}", productId, storeId);

        // Verwende den normalen ProductService, der bereits Varianten lädt
        // TODO: Benötigt public Version ohne Store Auth
        try {
            ProductDTO product = productService.getPublicProductById(productId, storeId);
            return ResponseEntity.ok(product);
        } catch (Exception e) {
            log.error("Error fetching product {}: {}", productId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Track product view", description = "Increments view count for analytics")
    @PostMapping("/{productId}/view")
    public ResponseEntity<Void> trackView(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId) {

        log.debug("Tracking view for product {} in store {}", productId, storeId);
        productService.incrementViewCount(productId);

        return ResponseEntity.ok().build();
    }

    /**
     * PUBLIC: Varianten für Storefront – kein Auth erforderlich.
     * Gibt nur aktive Varianten zurück.
     */
    @Operation(summary = "Get public variants for a product", description = "Returns active variants for storefront (no auth)")
    @GetMapping("/{productId}/variants")
    public ResponseEntity<List<ProductVariantDTO>> getPublicVariants(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId) {

        log.info("Public: Getting variants for product {} in store {}", productId, storeId);
        try {
            List<ProductVariantDTO> variants = productVariantService.getPublicVariantsByProduct(productId, storeId);
            return ResponseEntity.ok(variants);
        } catch (Exception e) {
            log.error("Error fetching public variants for product {}: {}", productId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}


package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ProductDTO;
import storebackend.service.ProductService;

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

    @Operation(summary = "Track product view", description = "Increments view count for analytics")
    @PostMapping("/{productId}/view")
    public ResponseEntity<Void> trackView(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId) {

        log.debug("Tracking view for product {} in store {}", productId, storeId);
        productService.incrementViewCount(productId);

        return ResponseEntity.ok().build();
    }
}


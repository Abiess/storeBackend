package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.ProductOptionDTO;
import storebackend.dto.ProductVariantDTO;
import storebackend.entity.Store;
import storebackend.repository.StoreRepository;
import storebackend.service.ProductOptionService;
import storebackend.service.ProductVariantService;

import java.util.List;

/**
 * PUBLIC API für Product Options & Variants
 * Keine Authentifizierung erforderlich - für Storefront
 */
@RestController
@RequestMapping("/api/public/stores/{storeId}/products/{productId}")
@Tag(name = "Public Product Variants", description = "Public APIs for product options and variants")
@RequiredArgsConstructor
@Slf4j
public class PublicProductVariantController {

    private final ProductOptionService productOptionService;
    private final ProductVariantService productVariantService;
    private final StoreRepository storeRepository;

    @Operation(summary = "Get all options for a product (public)")
    @GetMapping("/options")
    public ResponseEntity<List<ProductOptionDTO>> getProductOptions(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId) {

        log.info("PUBLIC: GET /api/public/stores/{}/products/{}/options", storeId, productId);

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            log.warn("Store {} not found", storeId);
            return ResponseEntity.notFound().build();
        }

        try {
            List<ProductOptionDTO> options = productOptionService.getOptionsByProduct(productId, store);
            log.info("PUBLIC: Returning {} options for product {}", options.size(), productId);
            return ResponseEntity.ok(options);
        } catch (Exception e) {
            log.error("PUBLIC: Error fetching options for product {}: {}", productId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Get all variants for a product (public)")
    @GetMapping("/variants")
    public ResponseEntity<List<ProductVariantDTO>> getProductVariants(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId) {

        log.info("PUBLIC: GET /api/public/stores/{}/products/{}/variants", storeId, productId);

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            log.warn("Store {} not found", storeId);
            return ResponseEntity.notFound().build();
        }

        try {
            List<ProductVariantDTO> variants = productVariantService.getVariantsByProduct(productId, store);
            log.info("PUBLIC: Returning {} variants for product {}", variants.size(), productId);
            return ResponseEntity.ok(variants);
        } catch (Exception e) {
            log.error("PUBLIC: Error fetching variants for product {}: {}", productId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Get single variant details (public)")
    @GetMapping("/variants/{variantId}")
    public ResponseEntity<ProductVariantDTO> getVariantDetails(
            @Parameter(description = "Store ID") @PathVariable Long storeId,
            @Parameter(description = "Product ID") @PathVariable Long productId,
            @Parameter(description = "Variant ID") @PathVariable Long variantId) {

        log.info("PUBLIC: GET /api/public/stores/{}/products/{}/variants/{}", storeId, productId, variantId);

        Store store = storeRepository.findById(storeId).orElse(null);
        if (store == null) {
            log.warn("Store {} not found", storeId);
            return ResponseEntity.notFound().build();
        }

        try {
            ProductVariantDTO variant = productVariantService.getVariantById(variantId, productId, store);
            log.info("PUBLIC: Returning variant {} for product {}", variantId, productId);
            return ResponseEntity.ok(variant);
        } catch (Exception e) {
            log.error("PUBLIC: Error fetching variant {}: {}", variantId, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
}


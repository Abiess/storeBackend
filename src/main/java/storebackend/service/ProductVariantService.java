package storebackend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.GenerateVariantsRequest;
import storebackend.dto.ProductOptionDTO;
import storebackend.dto.ProductVariantDTO;
import storebackend.entity.Product;
import storebackend.entity.ProductVariant;
import storebackend.entity.Store;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductVariantRepository;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductVariantService {

    private final ProductVariantRepository variantRepository;
    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public List<ProductVariantDTO> getVariantsByProduct(Long productId, Store store) {
        // Verify product belongs to store
        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        return variantRepository.findByProductId(productId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductVariantDTO getVariantById(Long variantId, Long productId, Store store) {
        // Verify product belongs to store
        productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new RuntimeException("Variant does not belong to this product");
        }

        return toDTO(variant);
    }

    @Transactional
    public ProductVariantDTO createVariant(Long productId, Store store, ProductVariantDTO request) {
        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Check if SKU is unique
        if (request.getSku() != null) {
            boolean skuExists = variantRepository.existsBySku(request.getSku());
            if (skuExists) {
                throw new RuntimeException("SKU already exists");
            }
        }

        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku(request.getSku());
        variant.setBarcode(request.getBarcode());
        variant.setPrice(request.getPrice());
        variant.setComparePrice(request.getComparePrice());
        variant.setCostPrice(request.getCostPrice());
        variant.setStockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0);
        variant.setQuantity(request.getQuantity() != null ? request.getQuantity() : 0);
        variant.setWeight(request.getWeight());
        variant.setOption1(request.getOption1());
        variant.setOption2(request.getOption2());
        variant.setOption3(request.getOption3());
        variant.setImageUrl(request.getImageUrl());
        variant.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        // Convert attributes map to JSON string
        if (request.getAttributes() != null && !request.getAttributes().isEmpty()) {
            try {
                String json = objectMapper.writeValueAsString(request.getAttributes());
                variant.setAttributesJson(json);
            } catch (Exception e) {
                log.error("Error serializing attributes", e);
            }
        }

        // FIXED: Convert images array to JSON string for mediaUrls field
        if (request.getImages() != null && !request.getImages().isEmpty()) {
            try {
                String json = objectMapper.writeValueAsString(request.getImages());
                variant.setMediaUrls(json);
                
                // Setze imageUrl auf das erste Bild (Hauptbild)
                variant.setImageUrl(request.getImages().get(0));
            } catch (Exception e) {
                log.error("Error serializing images", e);
            }
        }

        variant = variantRepository.save(variant);
        log.info("Created variant {} for product {}", variant.getId(), productId);

        return toDTO(variant);
    }

    @Transactional
    public ProductVariantDTO updateVariant(Long variantId, Long productId, Store store, ProductVariantDTO request) {
        // Verify product belongs to store
        productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new RuntimeException("Variant does not belong to this product");
        }

        // Check SKU uniqueness if changed
        if (request.getSku() != null && !request.getSku().equals(variant.getSku())) {
            boolean skuExists = variantRepository.existsBySkuAndIdNot(request.getSku(), variantId);
            if (skuExists) {
                throw new RuntimeException("SKU already exists");
            }
            variant.setSku(request.getSku());
        }

        if (request.getPrice() != null) {
            variant.setPrice(request.getPrice());
        }
        if (request.getStockQuantity() != null) {
            variant.setStockQuantity(request.getStockQuantity());
        }
        if (request.getImageUrl() != null) {
            variant.setImageUrl(request.getImageUrl());
        }
        if (request.getBarcode() != null) {
            variant.setBarcode(request.getBarcode());
        }
        if (request.getComparePrice() != null) {
            variant.setComparePrice(request.getComparePrice());
        }
        if (request.getCostPrice() != null) {
            variant.setCostPrice(request.getCostPrice());
        }
        if (request.getQuantity() != null) {
            variant.setQuantity(request.getQuantity());
        }
        if (request.getWeight() != null) {
            variant.setWeight(request.getWeight());
        }
        if (request.getOption1() != null) {
            variant.setOption1(request.getOption1());
        }
        if (request.getOption2() != null) {
            variant.setOption2(request.getOption2());
        }
        if (request.getOption3() != null) {
            variant.setOption3(request.getOption3());
        }
        if (request.getIsActive() != null) {
            variant.setIsActive(request.getIsActive());
        }

        // Update attributes
        if (request.getAttributes() != null) {
            try {
                String json = objectMapper.writeValueAsString(request.getAttributes());
                variant.setAttributesJson(json);
            } catch (Exception e) {
                log.error("Error serializing attributes", e);
            }
        }

        // FIXED: Update images array (convert to JSON for mediaUrls field)
        if (request.getImages() != null) {
            try {
                String json = objectMapper.writeValueAsString(request.getImages());
                variant.setMediaUrls(json);
                
                // Setze auch imageUrl auf das erste Bild (Hauptbild)
                if (!request.getImages().isEmpty()) {
                    variant.setImageUrl(request.getImages().get(0));
                }
            } catch (Exception e) {
                log.error("Error serializing images", e);
            }
        }

        variant = variantRepository.save(variant);
        log.info("Updated variant {}", variantId);

        return toDTO(variant);
    }

    @Transactional
    public void deleteVariant(Long variantId, Long productId, Store store) {
        // Verify product belongs to store
        productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        ProductVariant variant = variantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Variant not found"));

        if (!variant.getProduct().getId().equals(productId)) {
            throw new RuntimeException("Variant does not belong to this product");
        }

        variantRepository.delete(variant);
        log.info("Deleted variant {}", variantId);
    }

    /**
     * Generiert automatisch alle Varianten-Kombinationen basierend auf den Product Options
     * z.B. Farbe: [Rot, Blau] x Größe: [S, M, L] = 6 Varianten
     */
    @Transactional
    public List<ProductVariantDTO> generateVariants(GenerateVariantsRequest request, Store store) {
        Product product = productRepository.findByIdAndStore(request.getProductId(), store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (request.getOptions() == null || request.getOptions().isEmpty()) {
            throw new RuntimeException("No options provided");
        }

        // Lösche existierende Varianten (optional - könnte auch nur neue hinzufügen)
        List<ProductVariant> existingVariants = variantRepository.findByProductId(request.getProductId());
        if (!existingVariants.isEmpty()) {
            log.info("Deleting {} existing variants for product {}", existingVariants.size(), request.getProductId());
            variantRepository.deleteAll(existingVariants);
        }

        // Generiere alle Kombinationen
        List<Map<String, String>> combinations = generateCombinations(request.getOptions());
        List<ProductVariant> variants = new ArrayList<>();

        for (Map<String, String> combination : combinations) {
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);

            // Generiere SKU aus Kombination
            String sku = generateSku(product.getTitle(), combination);
            variant.setSku(sku);

            variant.setPrice(request.getBasePrice());
            variant.setStockQuantity(request.getBaseStock() != null ? request.getBaseStock() : 0);

            // Speichere Attribute als JSON
            try {
                String json = objectMapper.writeValueAsString(combination);
                variant.setAttributesJson(json);
            } catch (Exception e) {
                log.error("Error serializing attributes", e);
            }

            variants.add(variant);
        }

        variants = variantRepository.saveAll(variants);
        log.info("Generated {} variants for product {}", variants.size(), request.getProductId());

        return variants.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Generiert alle möglichen Kombinationen aus den Options
     */
    private List<Map<String, String>> generateCombinations(List<ProductOptionDTO> options) {
        List<Map<String, String>> result = new ArrayList<>();
        result.add(new HashMap<>());

        for (ProductOptionDTO option : options) {
            List<Map<String, String>> temp = new ArrayList<>();
            for (Map<String, String> combination : result) {
                for (String value : option.getValues()) {
                    Map<String, String> newCombination = new HashMap<>(combination);
                    newCombination.put(option.getName(), value);
                    temp.add(newCombination);
                }
            }
            result = temp;
        }

        return result;
    }

    /**
     * Generiert eine eindeutige SKU basierend auf Produktname und Attributen
     */
    private String generateSku(String productTitle, Map<String, String> attributes) {
        String baseSku = productTitle.toUpperCase()
                .replaceAll("[^A-Z0-9]", "")
                .substring(0, Math.min(productTitle.length(), 8));

        String attrSku = attributes.values().stream()
                .map(v -> v.toUpperCase().replaceAll("[^A-Z0-9]", "").substring(0, Math.min(v.length(), 3)))
                .collect(Collectors.joining("-"));

        return baseSku + "-" + attrSku + "-" + System.currentTimeMillis() % 10000;
    }

    private ProductVariantDTO toDTO(ProductVariant variant) {
        ProductVariantDTO dto = new ProductVariantDTO();
        dto.setId(variant.getId());
        dto.setProductId(variant.getProduct().getId());
        dto.setSku(variant.getSku());
        dto.setBarcode(variant.getBarcode());
        dto.setPrice(variant.getPrice());
        dto.setComparePrice(variant.getComparePrice());
        dto.setCostPrice(variant.getCostPrice());
        dto.setStockQuantity(variant.getStockQuantity());
        dto.setQuantity(variant.getQuantity());
        dto.setWeight(variant.getWeight());
        dto.setOption1(variant.getOption1());
        dto.setOption2(variant.getOption2());
        dto.setOption3(variant.getOption3());
        dto.setImageUrl(variant.getImageUrl());
        dto.setIsActive(variant.getIsActive());
        dto.setAttributesJson(variant.getAttributesJson());

        // FIXED: Parse attributesJson to attributes map
        if (variant.getAttributesJson() != null && !variant.getAttributesJson().isEmpty()) {
            try {
                Map<String, String> attributes = objectMapper.readValue(
                        variant.getAttributesJson(),
                        new TypeReference<Map<String, String>>() {}
                );
                dto.setAttributes(attributes);
            } catch (Exception e) {
                log.error("Error parsing attributes JSON", e);
            }
        }

        // FIXED: Parse mediaUrls JSON to images list (für Frontend)
        if (variant.getMediaUrls() != null && !variant.getMediaUrls().isEmpty()) {
            try {
                List<String> imagesList = objectMapper.readValue(
                        variant.getMediaUrls(),
                        new TypeReference<List<String>>() {}
                );
                dto.setImages(imagesList);
            } catch (Exception e) {
                log.warn("Error parsing mediaUrls JSON for variant {}: {}", variant.getId(), e.getMessage());
                // Fallback: Verwende imageUrl als einziges Bild
                if (variant.getImageUrl() != null) {
                    dto.setImages(List.of(variant.getImageUrl()));
                }
            }
        } else if (variant.getImageUrl() != null) {
            // Fallback: Verwende imageUrl als einziges Bild
            dto.setImages(List.of(variant.getImageUrl()));
        }

        return dto;
    }
}


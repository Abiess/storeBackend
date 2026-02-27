package storebackend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateProductRequest;
import storebackend.entity.Product;
import storebackend.entity.ProductOption;
import storebackend.entity.ProductVariant;
import storebackend.repository.ProductOptionRepository;
import storebackend.repository.ProductVariantRepository;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service für automatische Generierung von Produktvarianten basierend auf Optionen
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductVariantGenerationService {

    private final ProductOptionRepository productOptionRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ObjectMapper objectMapper;

    /**
     * Erstellt Optionen und generiert automatisch alle Varianten-Kombinationen
     */
    @Transactional
    public void createOptionsAndGenerateVariants(
            Product product,
            List<CreateProductRequest.VariantOptionInput> optionInputs
    ) {
        if (optionInputs == null || optionInputs.isEmpty()) {
            log.info("No options provided for product {}, skipping variant generation", product.getId());
            return;
        }

        // 1. Erstelle ProductOption Entities
        List<ProductOption> savedOptions = new ArrayList<>();
        int sortOrder = 0;

        for (CreateProductRequest.VariantOptionInput input : optionInputs) {
            if (input.getName() == null || input.getName().trim().isEmpty()) {
                log.warn("Skipping option with empty name");
                continue;
            }

            if (input.getValues() == null || input.getValues().isEmpty()) {
                log.warn("Skipping option '{}' with no values", input.getName());
                continue;
            }

            ProductOption option = new ProductOption();
            option.setProduct(product);
            option.setName(input.getName().trim());
            option.setValues(input.getValues().stream()
                    .map(String::trim)
                    .filter(v -> !v.isEmpty())
                    .collect(Collectors.toList()));
            option.setSortOrder(sortOrder++);

            savedOptions.add(productOptionRepository.save(option));
            log.info("Created option '{}' with {} values", option.getName(), option.getValues().size());
        }

        // 2. Generiere alle Varianten-Kombinationen
        if (!savedOptions.isEmpty()) {
            List<Map<String, String>> combinations = generateCombinations(savedOptions);
            createVariantsFromCombinations(product, combinations);
            log.info("Generated {} variants for product '{}'", combinations.size(), product.getTitle());
        }
    }

    /**
     * Generiert Varianten aus bestehenden ProductOptions (für Regenerierung)
     * Erstellt KEINE neuen Options, verwendet nur die übergebenen
     */
    @Transactional
    public void generateVariantsFromOptions(Product product, List<ProductOption> options) {
        if (options == null || options.isEmpty()) {
            log.warn("No options provided for variant generation of product {}", product.getId());
            return;
        }

        // Generiere alle Kombinationen aus bestehenden Optionen
        List<Map<String, String>> combinations = generateCombinations(options);
        createVariantsFromCombinations(product, combinations);
        log.info("Generated {} variants for product '{}' from existing options",
                 combinations.size(), product.getTitle());
    }

    /**
     * Generiert alle Kombinationen von Option-Werten
     */
    private List<Map<String, String>> generateCombinations(List<ProductOption> options) {
        List<Map<String, String>> combinations = new ArrayList<>();
        generateCombinationsRecursive(options, 0, new HashMap<>(), combinations);
        return combinations;
    }

    private void generateCombinationsRecursive(
            List<ProductOption> options,
            int currentIndex,
            Map<String, String> current,
            List<Map<String, String>> result
    ) {
        if (currentIndex == options.size()) {
            result.add(new HashMap<>(current));
            return;
        }

        ProductOption option = options.get(currentIndex);
        for (String value : option.getValues()) {
            current.put(option.getName(), value);
            generateCombinationsRecursive(options, currentIndex + 1, current, result);
            current.remove(option.getName());
        }
    }

    /**
     * Erstellt Varianten aus den Kombinationen
     */
    private void createVariantsFromCombinations(
            Product product,
            List<Map<String, String>> combinations
    ) {
        for (Map<String, String> attributes : combinations) {
            // SKU generieren: PRODUCT_TITLE-VALUE1-VALUE2-...
            String skuSuffix = attributes.values().stream()
                    .map(v -> v.replaceAll("[^a-zA-Z0-9]", ""))
                    .collect(Collectors.joining("-"));

            String baseSku = product.getTitle().replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            String sku = baseSku + "-" + skuSuffix;

            // Prüfe ob SKU bereits existiert
            if (productVariantRepository.existsBySku(sku)) {
                sku = sku + "-" + UUID.randomUUID().toString().substring(0, 4);
            }

            // Konvertiere attributes Map zu JSON String
            String attributesJson;
            try {
                attributesJson = objectMapper.writeValueAsString(attributes);
            } catch (JsonProcessingException e) {
                log.error("Failed to serialize attributes to JSON", e);
                attributesJson = "{}";
            }

            // Erstelle Variante
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);
            variant.setSku(sku);
            variant.setPrice(product.getBasePrice());
            variant.setStockQuantity(0);
            variant.setAttributesJson(attributesJson);

            productVariantRepository.save(variant);
            log.debug("Created variant: {} - {}", sku, attributes);
        }
    }
}


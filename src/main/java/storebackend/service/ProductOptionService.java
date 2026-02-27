package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ProductOptionDTO;
import storebackend.entity.Product;
import storebackend.entity.ProductOption;
import storebackend.entity.Store;
import storebackend.repository.ProductOptionRepository;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductVariantRepository;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductOptionService {
    private final ProductOptionRepository productOptionRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductVariantGenerationService variantGenerationService;

    @Transactional(readOnly = true)
    public List<ProductOptionDTO> getOptionsByProduct(Long productId, Store store) {
        // Verify product belongs to store
        productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        return productOptionRepository.findByProductIdOrderBySortOrderAsc(productId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProductOptionDTO createOption(Long productId, Store store, ProductOptionDTO request) {
        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        ProductOption option = new ProductOption();
        option.setProduct(product);
        option.setName(request.getName());
        option.setValues(request.getValues());
        option.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);

        option = productOptionRepository.save(option);
        return toDTO(option);
    }

    @Transactional
    public ProductOptionDTO updateOption(Long optionId, Long productId, Store store, ProductOptionDTO request) {
        // Verify product belongs to store
        productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        ProductOption option = productOptionRepository.findById(optionId)
                .orElseThrow(() -> new RuntimeException("Product option not found"));

        if (!option.getProduct().getId().equals(productId)) {
            throw new RuntimeException("Option does not belong to this product");
        }

        option.setName(request.getName());
        option.setValues(request.getValues());
        option.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0);

        option = productOptionRepository.save(option);
        return toDTO(option);
    }

    @Transactional
    public void deleteOption(Long optionId, Long productId, Store store) {
        // Verify product belongs to store
        productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        ProductOption option = productOptionRepository.findById(optionId)
                .orElseThrow(() -> new RuntimeException("Product option not found"));

        if (!option.getProduct().getId().equals(productId)) {
            throw new RuntimeException("Option does not belong to this product");
        }

        productOptionRepository.deleteById(optionId);
    }

    private ProductOptionDTO toDTO(ProductOption option) {
        ProductOptionDTO dto = new ProductOptionDTO();
        dto.setId(option.getId());
        dto.setProductId(option.getProduct().getId());
        dto.setName(option.getName());
        dto.setValues(option.getValues());
        dto.setSortOrder(option.getSortOrder());
        return dto;
    }

    /**
     * Regeneriert alle Varianten für ein Produkt basierend auf den aktuellen Optionen.
     * WARNUNG: Löscht alle bestehenden Varianten!
     */
    @Transactional
    public int regenerateVariants(Long productId, Store store) {
        log.info("Regenerating variants for product {} in store {}", productId, store.getId());

        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // 1. Lade alle Optionen für dieses Produkt
        List<ProductOption> options = productOptionRepository.findByProductIdOrderBySortOrderAsc(productId);

        if (options.isEmpty()) {
            log.warn("No options found for product {}. Cannot regenerate variants.", productId);
            throw new RuntimeException("Keine Optionen vorhanden. Bitte erst Optionen definieren.");
        }

        // 2. Lösche alle bestehenden Varianten
        int deletedCount = productVariantRepository.deleteByProductId(productId);
        log.info("Deleted {} existing variants for product {}", deletedCount, productId);

        // 3. Generiere neue Varianten direkt aus bestehenden ProductOption Entities
        variantGenerationService.generateVariantsFromOptions(product, options);

        // 4. Zähle neue Varianten
        int newCount = productVariantRepository.findByProductId(productId).size();
        log.info("Generated {} new variants for product {}", newCount, productId);

        return newCount;
    }
}


package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.ProductOptionDTO;
import storebackend.entity.Product;
import storebackend.entity.ProductOption;
import storebackend.entity.Store;
import storebackend.repository.ProductOptionRepository;
import storebackend.repository.ProductRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductOptionService {
    private final ProductOptionRepository productOptionRepository;
    private final ProductRepository productRepository;

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
}


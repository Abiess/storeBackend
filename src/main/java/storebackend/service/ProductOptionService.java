package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.ProductOption;
import storebackend.repository.ProductOptionRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductOptionService {
    private final ProductOptionRepository productOptionRepository;

    @Transactional(readOnly = true)
    public List<ProductOption> getOptionsByProduct(Long productId) {
        return productOptionRepository.findByProductIdOrderBySortOrderAsc(productId);
    }

    @Transactional
    public ProductOption createOption(ProductOption option) {
        return productOptionRepository.save(option);
    }

    @Transactional
    public ProductOption updateOption(Long id, ProductOption option) {
        ProductOption existing = productOptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product option not found"));
        existing.setName(option.getName());
        existing.setValues(option.getValues());
        existing.setSortOrder(option.getSortOrder());
        return productOptionRepository.save(existing);
    }

    @Transactional
    public void deleteOption(Long id) {
        productOptionRepository.deleteById(id);
    }
}


package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.ProductMedia;
import storebackend.repository.ProductMediaRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductMediaService {
    private final ProductMediaRepository productMediaRepository;

    @Transactional(readOnly = true)
    public List<ProductMedia> getMediaByProduct(Long productId) {
        return productMediaRepository.findByProductIdOrderBySortOrderAsc(productId);
    }

    @Transactional
    public ProductMedia addMediaToProduct(ProductMedia productMedia) {
        // If setting as primary, unset other primary images
        if (productMedia.getIsPrimary()) {
            productMediaRepository.findByProductIdAndIsPrimaryTrue(productMedia.getProduct().getId())
                    .ifPresent(existing -> {
                        existing.setIsPrimary(false);
                        productMediaRepository.save(existing);
                    });
        }
        return productMediaRepository.save(productMedia);
    }

    @Transactional
    public ProductMedia setPrimaryImage(Long productId, Long mediaId) {
        // Unset all primary flags for this product
        List<ProductMedia> allMedia = productMediaRepository.findByProductIdOrderBySortOrderAsc(productId);
        allMedia.forEach(pm -> pm.setIsPrimary(false));
        productMediaRepository.saveAll(allMedia);

        // Set the new primary
        ProductMedia primaryMedia = productMediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Product media not found"));
        primaryMedia.setIsPrimary(true);
        return productMediaRepository.save(primaryMedia);
    }

    @Transactional
    public ProductMedia updateProductMedia(Long id, ProductMedia productMedia) {
        ProductMedia existing = productMediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product media not found"));
        existing.setSortOrder(productMedia.getSortOrder());
        if (productMedia.getIsPrimary() != null) {
            if (productMedia.getIsPrimary()) {
                setPrimaryImage(existing.getProduct().getId(), id);
            } else {
                existing.setIsPrimary(false);
            }
        }
        return productMediaRepository.save(existing);
    }

    @Transactional
    public void deleteProductMedia(Long id) {
        productMediaRepository.deleteById(id);
    }
}


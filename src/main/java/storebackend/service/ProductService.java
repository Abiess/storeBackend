package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import storebackend.dto.CreateProductRequest;
import storebackend.dto.ProductDTO;
import storebackend.entity.Category;
import storebackend.entity.Product;
import storebackend.entity.ProductMedia;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.CategoryRepository;
import storebackend.repository.ProductMediaRepository;
import storebackend.repository.ProductRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMediaRepository productMediaRepository;
    private final StoreUsageService storeUsageService;
    private final MinioService minioService;

    public List<ProductDTO> getProductsByStore(Store store) {
        return productRepository.findByStore(store).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public ProductDTO getProductById(Long productId, Store store) {
        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return toDTO(product);
    }

    public ProductDTO createProduct(CreateProductRequest request, Store store, User owner) {
        // Check product limit
        if (!storeUsageService.canCreateProduct(store, owner)) {
            throw new RuntimeException("Product limit reached. Please upgrade your plan.");
        }

        Product product = new Product();
        product.setStore(store);
        product.setTitle(request.getTitle());
        product.setDescription(request.getDescription());
        product.setBasePrice(request.getBasePrice());
        product.setStatus(request.getStatus());

        // Set category if provided
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            // Verify category belongs to same store
            if (!category.getStore().getId().equals(store.getId())) {
                throw new RuntimeException("Category does not belong to this store");
            }
            product.setCategory(category);
        }

        product = productRepository.save(product);

        // Increment product count
        storeUsageService.incrementProductCount(store);

        return toDTO(product);
    }

    public ProductDTO updateProduct(Long productId, CreateProductRequest request, Store store) {
        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        product.setTitle(request.getTitle());
        product.setDescription(request.getDescription());
        product.setBasePrice(request.getBasePrice());
        product.setStatus(request.getStatus());

        // Update category if provided
        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            if (!category.getStore().getId().equals(store.getId())) {
                throw new RuntimeException("Category does not belong to this store");
            }
            product.setCategory(category);
        } else {
            product.setCategory(null);
        }

        product = productRepository.save(product);
        return toDTO(product);
    }

    public void deleteProduct(Long productId, Store store) {
        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        productRepository.delete(product);

        // Decrement product count
        storeUsageService.decrementProductCount(store);
    }

    private ProductDTO toDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setTitle(product.getTitle());
        dto.setDescription(product.getDescription());
        dto.setBasePrice(product.getBasePrice());
        dto.setStatus(product.getStatus());
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedAt(product.getUpdatedAt());

        // Add category information
        if (product.getCategory() != null) {
            dto.setCategoryId(product.getCategory().getId());
            dto.setCategoryName(product.getCategory().getName());
        }

        // Lade Bilder für das Produkt
        List<ProductMedia> productMedia = productMediaRepository.findByProductIdOrderBySortOrderAsc(product.getId());

        if (!productMedia.isEmpty()) {
            // Konvertiere zu DTOs
            List<ProductDTO.ProductMediaDTO> mediaList = productMedia.stream()
                    .map(pm -> {
                        ProductDTO.ProductMediaDTO mediaDTO = new ProductDTO.ProductMediaDTO();
                        mediaDTO.setId(pm.getId());
                        mediaDTO.setMediaId(pm.getMedia().getId());

                        // Generiere URL über MinioService
                        try {
                            String url = minioService.getPresignedUrl(pm.getMedia().getMinioObjectName(), 60);
                            mediaDTO.setUrl(url);
                        } catch (Exception e) {
                            // Fallback: leere URL
                            mediaDTO.setUrl("");
                        }

                        mediaDTO.setFilename(pm.getMedia().getFilename());
                        mediaDTO.setIsPrimary(pm.getIsPrimary());
                        mediaDTO.setSortOrder(pm.getSortOrder());
                        return mediaDTO;
                    })
                    .collect(Collectors.toList());

            dto.setMedia(mediaList);

            // Setze Primary Image URL
            productMedia.stream()
                    .filter(ProductMedia::getIsPrimary)
                    .findFirst()
                    .ifPresent(pm -> {
                        try {
                            String url = minioService.getPresignedUrl(pm.getMedia().getMinioObjectName(), 60);
                            dto.setPrimaryImageUrl(url);
                        } catch (Exception e) {
                            dto.setPrimaryImageUrl("");
                        }
                    });

            // Falls kein Primary-Bild, nimm das erste
            if (dto.getPrimaryImageUrl() == null && !productMedia.isEmpty()) {
                try {
                    String url = minioService.getPresignedUrl(productMedia.get(0).getMedia().getMinioObjectName(), 60);
                    dto.setPrimaryImageUrl(url);
                } catch (Exception e) {
                    dto.setPrimaryImageUrl("");
                }
            }
        }

        return dto;
    }
}

package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import storebackend.dto.CreateProductRequest;
import storebackend.dto.ProductDTO;
import storebackend.entity.Category;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.CategoryRepository;
import storebackend.repository.ProductRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final StoreUsageService storeUsageService;

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

        return dto;
    }
}

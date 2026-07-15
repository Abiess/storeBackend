package storebackend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CreateProductRequest;
import storebackend.dto.ProductDTO;
import storebackend.dto.ProductMediaDTO;
import storebackend.dto.ProductVariantDTO;
import storebackend.entity.Category;
import storebackend.entity.Product;
import storebackend.entity.ProductMedia;
import storebackend.entity.ProductVariant;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.ProductStatus;
import storebackend.repository.CategoryRepository;
import storebackend.repository.ProductMediaRepository;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductVariantRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMediaRepository productMediaRepository;
    private final ProductVariantRepository productVariantRepository;
    private final StoreUsageService storeUsageService;
    private final MinioService minioService;
    private final ObjectMapper objectMapper;
    private final ProductVariantGenerationService variantGenerationService;

    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsByStore(Store store) {
        // FIXED: Use JOIN FETCH to avoid LazyInitializationException
        return productRepository.findByStoreWithCategory(store).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Holt alle Produkte für einen Store, optional gefiltert nach Kategorie
     */
    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsByStoreAndCategory(Store store, Long categoryId) {
        if (categoryId == null) {
            // Alle Produkte zurückgeben
            return getProductsByStore(store);
        }

        // FIXED: Use JOIN FETCH to avoid LazyInitializationException
        // Produkte nach Kategorie filtern
        return productRepository.findByStoreWithCategory(store).stream()
                .filter(p -> p.getCategory() != null && p.getCategory().getId().equals(categoryId))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductDTO getProductById(Long productId, Store store) {
        // FIXED: Use JOIN FETCH to avoid LazyInitializationException
        Product product = productRepository.findByIdAndStoreWithCategory(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        return toDTO(product);
    }

    @Transactional
    public ProductDTO createProduct(CreateProductRequest request, Store store, User owner) {
        // Check product limit
        if (!storeUsageService.canCreateProduct(store, owner)) {
            throw new RuntimeException("Product limit reached. Please upgrade your plan.");
        }

        Product product = new Product();
        product.setStore(store);
        product.setTitle(request.getTitle());
        product.setSku(request.getSku());
        product.setDescription(request.getDescription());
        product.setBasePrice(request.getBasePrice());
        product.setStock(request.getStock() != null ? request.getStock() : 0);
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

        // Generiere Varianten wenn Optionen vorhanden sind
        if (request.getVariantOptions() != null && !request.getVariantOptions().isEmpty()) {
            variantGenerationService.createOptionsAndGenerateVariants(product, request.getVariantOptions());
        }

        return toDTO(product);
    }

    @Transactional
    public ProductDTO updateProduct(Long productId, CreateProductRequest request, Store store) {
        Product product = productRepository.findByIdAndStoreWithCategory(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

    product.setTitle(request.getTitle());
    product.setSku(request.getSku());
    product.setDescription(request.getDescription());
    product.setBasePrice(request.getBasePrice());
    product.setStock(request.getStock() != null ? request.getStock() : 0);
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

    /**
     * Partial update – nur angegebene Felder werden überschrieben.
     * Unterstützt: status, title, basePrice, stock, categoryId, featured, featuredOrder
     * Wird vom PATCH-Endpunkt und vom bulkUpdateStatus (Frontend) genutzt.
     */
    @Transactional
    public ProductDTO patchProduct(Long productId, Map<String, Object> fields, Store store) {
        Product product = productRepository.findByIdAndStoreWithCategory(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

        if (fields.containsKey("status")) {
            String statusVal = fields.get("status").toString();
            try { product.setStatus(ProductStatus.valueOf(statusVal)); }
            catch (IllegalArgumentException e) { throw new RuntimeException("Ungültiger Status: " + statusVal); }
        }
        if (fields.containsKey("title") && fields.get("title") != null) {
            product.setTitle(fields.get("title").toString());
        }
        if (fields.containsKey("basePrice") && fields.get("basePrice") != null) {
            product.setBasePrice(new BigDecimal(fields.get("basePrice").toString()));
        }
        if (fields.containsKey("stock") && fields.get("stock") != null) {
            product.setStock(Integer.parseInt(fields.get("stock").toString()));
        }
        if (fields.containsKey("description")) {
            product.setDescription(fields.get("description") != null ? fields.get("description").toString() : null);
        }
        if (fields.containsKey("categoryId")) {
            Object catId = fields.get("categoryId");
            if (catId == null) {
                product.setCategory(null);
            } else {
                Long categoryId = Long.parseLong(catId.toString());
                Category category = categoryRepository.findById(categoryId)
                        .orElseThrow(() -> new RuntimeException("Category not found"));
                if (!category.getStore().getId().equals(store.getId())) {
                    throw new RuntimeException("Category does not belong to this store");
                }
                product.setCategory(category);
            }
        }
        if (fields.containsKey("featured") && fields.get("featured") != null) {
            product.setIsFeatured(Boolean.parseBoolean(fields.get("featured").toString()));
        }
        if (fields.containsKey("featuredOrder") && fields.get("featuredOrder") != null) {
            product.setFeaturedOrder(Integer.parseInt(fields.get("featuredOrder").toString()));
        }

        return toDTO(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long productId, Store store) {        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));
        productRepository.delete(product);

        // Decrement product count
        storeUsageService.decrementProductCount(store);
    }

    private ProductDTO toDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setTitle(product.getTitle());
        dto.setSku(product.getSku());
        dto.setDescription(product.getDescription());
        dto.setBasePrice(product.getBasePrice());
        dto.setStock(product.getStock() != null ? product.getStock() : 0);
        dto.setStatus(product.getStatus());
        dto.setCreatedAt(product.getCreatedAt());
        dto.setUpdatedAt(product.getUpdatedAt());
        // Direkte Bild-URL (z.B. Starter-Pack-Asset) – dient als Fallback
        dto.setImageUrl(product.getImageUrl());

        // Featured/Top Product Informationen
        dto.setIsFeatured(product.getIsFeatured());
        dto.setFeaturedOrder(product.getFeaturedOrder());
        dto.setViewCount(product.getViewCount());
        dto.setSalesCount(product.getSalesCount());

        // Add category information
        if (product.getCategory() != null) {
            dto.setCategoryId(product.getCategory().getId());
            dto.setCategoryName(product.getCategory().getName());
        }

        // Lade Bilder für das Produkt
        List<ProductMedia> productMedia = productMediaRepository.findByProductIdOrderBySortOrderAsc(product.getId());

        if (!productMedia.isEmpty()) {
            // Konvertiere zu DTOs (nutzt standalone ProductMediaDTO)
            List<ProductMediaDTO> mediaList = productMedia.stream()
                    .map(pm -> {
                        ProductMediaDTO mediaDTO = new ProductMediaDTO();
                        mediaDTO.setId(pm.getId());
                        mediaDTO.setProductId(pm.getProduct().getId());
                        mediaDTO.setMediaId(pm.getMedia().getId());

                        // Generiere permanente öffentliche URL über MinioService
                        try {
                            String url = minioService.getPublicUrl(pm.getMedia().getMinioObjectName());
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

            // Setze Primary Image URL über zentrale Methode
            String primaryImageUrl = resolveProductImageUrl(product);
            dto.setPrimaryImageUrl(primaryImageUrl);
        }

        // Lade Varianten für das Produkt
        List<ProductVariant> variants = productVariantRepository.findByProductId(product.getId());
        if (!variants.isEmpty()) {
            List<ProductVariantDTO> variantDTOs = variants.stream()
                    .map(this::variantToDTO)
                    .collect(Collectors.toList());
            dto.setVariants(variantDTOs);
        }

        // Fallback: kein Media-Bild → direkte imageUrl als Primary verwenden
        if ((dto.getPrimaryImageUrl() == null || dto.getPrimaryImageUrl().isEmpty())
                && product.getImageUrl() != null && !product.getImageUrl().isEmpty()) {
            dto.setPrimaryImageUrl(product.getImageUrl());
        }

        return dto;
    }

    private ProductVariantDTO variantToDTO(ProductVariant variant) {
        ProductVariantDTO dto = new ProductVariantDTO();
        dto.setId(variant.getId());
        dto.setProductId(variant.getProduct().getId());
        dto.setSku(variant.getSku());
        dto.setBarcode(variant.getBarcode());
        dto.setPrice(variant.getPrice());
        dto.setComparePrice(variant.getComparePrice());
        dto.setStockQuantity(variant.getStockQuantity());
        dto.setOption1(variant.getOption1());
        dto.setOption2(variant.getOption2());
        dto.setOption3(variant.getOption3());
        dto.setImageUrl(variant.getImageUrl());
        dto.setIsActive(variant.getIsActive());
        dto.setAttributesJson(variant.getAttributesJson());

        // Parse attributesJson to Map for UI
        if (variant.getAttributesJson() != null && !variant.getAttributesJson().isEmpty()) {
            try {
                Map<String, String> attributes = objectMapper.readValue(
                        variant.getAttributesJson(),
                        new TypeReference<Map<String, String>>() {}
                );
                dto.setAttributes(attributes);
            } catch (Exception e) {
                // Ignore parsing errors
            }
        }

        // Parse mediaUrls JSON to images list (damit Frontend Varianten-Bilder anzeigen kann)
        if (variant.getMediaUrls() != null && !variant.getMediaUrls().isEmpty()) {
            try {
                List<String> imagesList = objectMapper.readValue(
                        variant.getMediaUrls(),
                        new TypeReference<List<String>>() {}
                );
                dto.setImages(imagesList);
            } catch (Exception e) {
                // Fallback: imageUrl als einziges Bild
                if (variant.getImageUrl() != null) {
                    dto.setImages(java.util.List.of(variant.getImageUrl()));
                }
            }
        } else if (variant.getImageUrl() != null) {
            // Fallback: imageUrl als einziges Bild
            dto.setImages(java.util.List.of(variant.getImageUrl()));
        }

        return dto;
    }

    // Featured Products Methoden
    @Transactional(readOnly = true)
    public List<ProductDTO> getFeaturedProducts(Long storeId) {
        return productRepository.findByStoreIdAndIsFeaturedTrueOrderByFeaturedOrderAsc(storeId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> getTopProducts(Long storeId, int limit) {
        return productRepository.findTop10ByStoreIdOrderBySalesCountDesc(storeId)
                .stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> getTrendingProducts(Long storeId, int limit) {
        return productRepository.findTop10ByStoreIdOrderByViewCountDesc(storeId)
                .stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> getNewArrivals(Long storeId, int limit) {
        return productRepository.findTop10ByStoreIdOrderByCreatedAtDesc(storeId)
                .stream()
                .limit(limit)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void incrementViewCount(Long productId) {
        productRepository.findById(productId).ifPresent(product -> {
            product.setViewCount(product.getViewCount() + 1);
            productRepository.save(product);
        });
    }

    @Transactional
    public void incrementSalesCount(Long productId, int quantity) {
        productRepository.findById(productId).ifPresent(product -> {
            product.setSalesCount(product.getSalesCount() + quantity);
            productRepository.save(product);
        });
    }

    @Transactional(readOnly = true)
    public ProductDTO getPublicProductById(Long productId, Long storeId) {
        // Öffentlicher Zugriff - keine Store-Auth nötig
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Product does not belong to this store");
        }

        return toDTO(product);
    }

    @Transactional
    public ProductDTO setFeatured(Long productId, Store store, boolean featured, Integer order) {
        Product product = productRepository.findByIdAndStore(productId, store)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        product.setIsFeatured(featured);
        if (order != null) {
            product.setFeaturedOrder(order);
        }

        product = productRepository.save(product);
        return toDTO(product);
    }

    /**
     * ZENTRALE Methode zur Auflösung der Produktbild-URL.
     * Wird von toDTO() und CartController verwendet.
     * 
     * Logik:
     * 1. Suche Primary ProductMedia → MinIO presigned URL
     * 2. Falls kein Primary, nimm erstes ProductMedia → MinIO presigned URL
     * 3. Fallback: product.getImageUrl() (z.B. WooCommerce-Import)
     * 4. Kein Bild: null (Frontend zeigt Platzhalter)
     * 
     * @param product Das Produkt
     * @return Vollständige Bild-URL oder null
     */
    public String resolveProductImageUrl(Product product) {
        if (product == null) {
            return null;
        }

        // 1. Versuche ProductMedia + MinIO
        try {
            List<ProductMedia> mediaList = productMediaRepository.findByProductIdOrderBySortOrderAsc(product.getId());
            
            if (!mediaList.isEmpty()) {
                // Suche Primary Image oder nimm erstes
                ProductMedia primaryMedia = mediaList.stream()
                    .filter(ProductMedia::getIsPrimary)
                    .findFirst()
                    .orElse(mediaList.get(0));
                
                // Generiere permanente öffentliche MinIO-URL (kein Ablaufdatum)
                String url = minioService.getPublicUrl(primaryMedia.getMedia().getMinioObjectName());
                if (url != null && !url.isEmpty()) {
                    return url;
                }
            }
        } catch (Exception e) {
            // Log und fahre mit Fallback fort
        }
        
        // 2. Fallback: product.getImageUrl() (z.B. WooCommerce-Import, externe URLs)
        if (product.getImageUrl() != null && !product.getImageUrl().isEmpty()) {
            return product.getImageUrl();
        }
        
        // 3. Kein Bild verfügbar - Frontend zeigt Platzhalter
        return null;
    }
}

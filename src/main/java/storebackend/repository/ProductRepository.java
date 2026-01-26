package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import storebackend.entity.Product;
import storebackend.entity.Store;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStore(Store store);
    Optional<Product> findByIdAndStore(Long id, Store store);

    // For SEO sitemap generation
    long countByStoreId(Long storeId);
    List<Product> findByStoreId(Long storeId);

    // Featured Products
    List<Product> findByStoreAndIsFeaturedTrueOrderByFeaturedOrderAsc(Store store);
    List<Product> findByStoreIdAndIsFeaturedTrueOrderByFeaturedOrderAsc(Long storeId);

    // Top Products (Bestseller)
    List<Product> findTop10ByStoreOrderBySalesCountDesc(Store store);
    List<Product> findTop10ByStoreIdOrderBySalesCountDesc(Long storeId);

    // Trending Products (meistgesehen)
    List<Product> findTop10ByStoreOrderByViewCountDesc(Store store);
    List<Product> findTop10ByStoreIdOrderByViewCountDesc(Long storeId);

    // New Arrivals
    List<Product> findTop10ByStoreOrderByCreatedAtDesc(Store store);
    List<Product> findTop10ByStoreIdOrderByCreatedAtDesc(Long storeId);
}

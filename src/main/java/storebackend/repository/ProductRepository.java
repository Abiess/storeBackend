package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Product;
import storebackend.entity.Store;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStore(Store store);
    Optional<Product> findByIdAndStore(Long id, Store store);

    // FIXED: Single product with JOIN FETCH
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.id = :id AND p.store = :store")
    Optional<Product> findByIdAndStoreWithCategory(@Param("id") Long id, @Param("store") Store store);

    // FIXED: JOIN FETCH to avoid LazyInitializationException
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store = :store")
    List<Product> findByStoreWithCategory(@Param("store") Store store);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store.id = :storeId")
    List<Product> findByStoreIdWithCategory(@Param("storeId") Long storeId);

    // For SEO sitemap generation
    long countByStoreId(Long storeId);
    List<Product> findByStoreId(Long storeId);

    // Featured Products - WITH JOIN FETCH
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store = :store AND p.isFeatured = true ORDER BY p.featuredOrder ASC")
    List<Product> findByStoreAndIsFeaturedTrueOrderByFeaturedOrderAsc(@Param("store") Store store);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store.id = :storeId AND p.isFeatured = true ORDER BY p.featuredOrder ASC")
    List<Product> findByStoreIdAndIsFeaturedTrueOrderByFeaturedOrderAsc(@Param("storeId") Long storeId);

    // Top Products (Bestseller) - WITH JOIN FETCH
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store = :store ORDER BY p.salesCount DESC")
    List<Product> findTop10ByStoreOrderBySalesCountDesc(@Param("store") Store store);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store.id = :storeId ORDER BY p.salesCount DESC")
    List<Product> findTop10ByStoreIdOrderBySalesCountDesc(@Param("storeId") Long storeId);

    // Trending Products (meistgesehen) - WITH JOIN FETCH
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store = :store ORDER BY p.viewCount DESC")
    List<Product> findTop10ByStoreOrderByViewCountDesc(@Param("store") Store store);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store.id = :storeId ORDER BY p.viewCount DESC")
    List<Product> findTop10ByStoreIdOrderByViewCountDesc(@Param("storeId") Long storeId);

    // New Arrivals - WITH JOIN FETCH
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store = :store ORDER BY p.createdAt DESC")
    List<Product> findTop10ByStoreOrderByCreatedAtDesc(@Param("store") Store store);

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.store.id = :storeId ORDER BY p.createdAt DESC")
    List<Product> findTop10ByStoreIdOrderByCreatedAtDesc(@Param("storeId") Long storeId);
}

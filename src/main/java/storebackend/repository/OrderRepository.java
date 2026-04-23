package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Order;
import storebackend.enums.OrderStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStoreIdOrderByCreatedAtDesc(Long storeId);
    List<Order> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<Order> findByCustomerId(Long customerId);  // NEUE Methode für Order Tracking
    List<Order> findByStoreIdAndStatusOrderByCreatedAtDesc(Long storeId, OrderStatus status);
    Optional<Order> findByOrderNumber(String orderNumber);
    List<Order> findByStoreIdAndCreatedAtBetween(Long storeId, LocalDateTime start, LocalDateTime end);

    // Delete method for cascade deletion
    void deleteByStoreId(Long storeId);

    /** Anzahl unterschiedlicher Endkunden (per E-Mail) über alle Stores eines Owners. */
    @Query("SELECT COUNT(DISTINCT o.customerEmail) FROM Order o " +
           "WHERE o.store.owner.id = :ownerId AND o.customerEmail IS NOT NULL")
    long countDistinctCustomersByOwnerId(@Param("ownerId") Long ownerId);
}

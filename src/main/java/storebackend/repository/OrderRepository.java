package storebackend.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Order;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentMethod;
import storebackend.enums.PaymentStatus;

import java.math.BigDecimal;
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
    
    /**
     * Lädt Order mit Pessimistic Write Lock (verhindert Race Conditions bei gleichzeitigen Updates)
     * WICHTIG: Nur in @Transactional-Kontext verwenden!
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);
    
    // ============================================
    // ANALYTICS QUERIES
    // ============================================
    
    /**
     * Gesamtumsatz für einen Store (mit optionalem Zeitraum)
     * Nur bezahlte Bestellungen (paymentStatus=PAID), ohne stornierte/fehlgeschlagene Orders
     */
    @Query("SELECT COALESCE(SUM(o.totalGross), 0) FROM Order o " +
           "WHERE o.store.id = :storeId " +
           "AND o.paymentStatus = :paymentStatus " +
           "AND o.status NOT IN (:excludedStatuses) " +
           "AND (:from IS NULL OR o.createdAt >= :from) " +
           "AND (:to IS NULL OR o.createdAt <= :to)")
    BigDecimal sumRevenueByStore(
        @Param("storeId") Long storeId,
        @Param("paymentStatus") PaymentStatus paymentStatus,
        @Param("excludedStatuses") List<OrderStatus> excludedStatuses,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
    
    /**
     * Anzahl bezahlter Bestellungen (mit optionalem Zeitraum)
     */
    @Query("SELECT COUNT(o) FROM Order o " +
           "WHERE o.store.id = :storeId " +
           "AND o.paymentStatus = :paymentStatus " +
           "AND (:from IS NULL OR o.createdAt >= :from) " +
           "AND (:to IS NULL OR o.createdAt <= :to)")
    Long countPaidOrders(
        @Param("storeId") Long storeId,
        @Param("paymentStatus") PaymentStatus paymentStatus,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
    
    /**
     * Bestellungen nach Status gruppieren (mit optionalem Zeitraum)
     */
    @Query("SELECT o.status, COUNT(o) FROM Order o " +
           "WHERE o.store.id = :storeId " +
           "AND (:from IS NULL OR o.createdAt >= :from) " +
           "AND (:to IS NULL OR o.createdAt <= :to) " +
           "GROUP BY o.status")
    List<Object[]> countByStoreGroupedByStatus(
        @Param("storeId") Long storeId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
    
    /**
     * Bestellungen nach Zahlungsart gruppieren (mit optionalem Zeitraum)
     */
    @Query("SELECT o.paymentMethod, COUNT(o) FROM Order o " +
           "WHERE o.store.id = :storeId " +
           "AND o.paymentMethod IS NOT NULL " +
           "AND (:from IS NULL OR o.createdAt >= :from) " +
           "AND (:to IS NULL OR o.createdAt <= :to) " +
           "GROUP BY o.paymentMethod")
    List<Object[]> countByStoreGroupedByPaymentMethod(
        @Param("storeId") Long storeId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
}

package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.dto.analytics.TopProductDTO;
import storebackend.entity.OrderItem;
import storebackend.enums.PaymentStatus;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderId(Long orderId);

    // Delete method for cascade deletion
    void deleteByOrderId(Long orderId);
    
    // ============================================
    // ANALYTICS QUERIES
    // ============================================
    
    /**
     * Top-Produkte nach Umsatz und Menge (mit optionalem Zeitraum)
     * Nur bezahlte Orders (paymentStatus=PAID)
     * 
     * WICHTIG: product_id kann NULL sein (Marketplace-Items), daher prüfen wir product IS NOT NULL
     */
    @Query("""
        SELECT new storebackend.dto.analytics.TopProductDTO(
            p.id,
            p.title,
            SUM(oi.quantity),
            SUM(oi.total),
            COUNT(DISTINCT o.id)
        )
        FROM OrderItem oi
        JOIN oi.order o
        JOIN oi.product p
        WHERE o.store.id = :storeId
        AND o.paymentStatus = :paymentStatus
        AND p IS NOT NULL
        AND (:from IS NULL OR o.createdAt >= :from)
        AND (:to IS NULL OR o.createdAt <= :to)
        GROUP BY p.id, p.title
        ORDER BY SUM(oi.total) DESC
    """)
    List<TopProductDTO> findTopProductsByRevenue(
        @Param("storeId") Long storeId,
        @Param("paymentStatus") PaymentStatus paymentStatus,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        org.springframework.data.domain.Pageable pageable
    );
}


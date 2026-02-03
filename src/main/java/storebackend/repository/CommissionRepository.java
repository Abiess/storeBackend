package storebackend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import storebackend.entity.Commission;
import storebackend.entity.Order;

import java.util.List;

@Repository
public interface CommissionRepository extends JpaRepository<Commission, Long> {

    List<Commission> findByOrder(Order order);

    List<Commission> findByOrderId(Long orderId);

    List<Commission> findByRecipientTypeAndRecipientId(String recipientType, Long recipientId);

    List<Commission> findByRecipientTypeAndRecipientIdAndStatus(String recipientType, Long recipientId, String status);

    @Query("SELECT SUM(c.amount) FROM Commission c WHERE c.recipientType = :type AND c.recipientId = :id AND c.status = :status")
    Double sumAmountByRecipient(@Param("type") String recipientType, @Param("id") Long recipientId, @Param("status") String status);
}

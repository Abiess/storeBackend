package storebackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Commission: Tracks revenue split for each order item.
 * Created at checkout for SUPPLIER, RESELLER, and PLATFORM.
 */
@Entity
@Table(name = "commissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Commission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    // Commission Recipient
    @Column(name = "recipient_type", nullable = false, length = 20)
    private String recipientType; // SUPPLIER, RESELLER, PLATFORM

    @Column(name = "recipient_id")
    private Long recipientId; // user_id for SUPPLIER, store_id for RESELLER, NULL for PLATFORM

    // Amounts
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(precision = 5, scale = 4)
    private BigDecimal percentage; // For audit trail

    // Status
    @Column(nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, APPROVED, PAID, CANCELLED

    // Timestamps
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}


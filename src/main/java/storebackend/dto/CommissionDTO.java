package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for commission records (revenue split tracking).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommissionDTO {
    private Long id;
    private Long orderId;
    private String orderNumber;
    private Long orderItemId;

    private String recipientType; // SUPPLIER, RESELLER, PLATFORM
    private Long recipientId;
    private String recipientName;

    private BigDecimal amount;
    private BigDecimal percentage;

    private String status; // PENDING, APPROVED, PAID, CANCELLED

    private String createdAt;
    private String approvedAt;
    private String paidAt;
}


package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Response nach erfolgreicher Punktevergabe (EARN-Transaction).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyPurchaseResponse {
    private Long loyaltyAccountId;
    private String customerName;
    private BigDecimal amount;
    private Integer pointsEarned;
    private Integer previousBalance;
    private Integer newBalance;
    private String currencyCode;
}

package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Credit Transaction – Response-DTO für die Credit-Historie (analog zu {@link LoyaltyTransactionDTO}).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditTransactionDTO {
    private Long id;
    /** 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT' | 'REVERSAL' */
    private String type;
    private BigDecimal amount;
    private BigDecimal resultingBalance;
    private String note;
    private Long orderId;
    private LocalDateTime createdAt;
}

package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Credit Account – Response-DTO (analog zu {@link LoyaltyAccountDTO}).
 * openAmount ist 0, falls noch kein CustomerCreditAccount existiert (lazy angelegt).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditAccountDTO {
    private Long loyaltyAccountId;
    private BigDecimal openAmount;
    /** NULL = kein Kreditlimit gesetzt */
    private BigDecimal creditLimit;
}

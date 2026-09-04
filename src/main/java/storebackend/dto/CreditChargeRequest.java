package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request für "Später bezahlen" (manuelle CHARGE-Buchung über die Loyalty-UI,
 * unabhängig vom POS-Checkout-Flow, der denselben CreditService intern nutzt).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditChargeRequest {
    private String identifier;
    private BigDecimal amount;
    private String note;
}

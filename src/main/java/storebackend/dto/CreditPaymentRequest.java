package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Request für "Zahlung erfassen" (PAYMENT-Buchung, reduziert den offenen Betrag). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditPaymentRequest {
    private String identifier;
    private BigDecimal amount;
    private String note;
}

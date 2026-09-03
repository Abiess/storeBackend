package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Loyalty Account – Response-DTO
 *
 * Wird nach erfolgreichem Code-Lookup zurückgegeben (Kunde + aktueller Punktestand).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyAccountDTO {
    private Long loyaltyAccountId;
    private Long customerProfileId;
    private String customerName;
    private Integer pointsBalance;
    private Integer lifetimePoints;
    /** Store-Währung (NICHT hardcodiert), für Anzeige in der UI */
    private String currencyCode;
}

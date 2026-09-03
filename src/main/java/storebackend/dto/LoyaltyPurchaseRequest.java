package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request für die Zuordnung eines Einkaufs zu einem Loyalty Account.
 *
 * MVP-Testflow: identifier + amount werden manuell übergeben.
 * Später (POS/Online-Checkout) wird derselbe {@code LoyaltyService} mit
 * denselben Parametern aus dem jeweiligen Order-Abschluss heraus aufgerufen.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyPurchaseRequest {
    /** Karten-/Kundencode (manueller Test-Code oder später NFC-UID) */
    private String identifier;

    /** Einkaufswert, für den Punkte berechnet werden sollen */
    private BigDecimal amount;
}

package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

/**
 * POS Order Request
 * 
 * Request-Body für POST /api/stores/{storeId}/pos/sales
 * 
 * WICHTIG:
 * - Preise werden serverseitig validiert (nicht vom Client vertrauen!)
 * - productId muss zu storeId gehören (Security Check)
 * - Bestand wird atomar reduziert (Race Condition Prevention)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PosOrderRequest {
    /**
     * Zahlungsart: "CASH" oder "CARD_EXTERNAL"
     * Wird zu PaymentMethod Enum konvertiert
     */
    private String paymentMethod;
    
    /**
     * Erhaltener Betrag (nur für CASH erforderlich)
     * Für CARD_EXTERNAL optional/NULL
     */
    private BigDecimal cashReceived;
    
    /**
     * Liste der verkauften Produkte
     * Nur productId + quantity, Preis wird serverseitig geladen
     */
    private List<PosOrderItemRequest> items;
    
    // Validation
    public boolean isValid() {
        return paymentMethod != null && 
               (paymentMethod.equals("CASH") || paymentMethod.equals("CARD_EXTERNAL")) &&
               items != null && 
               !items.isEmpty() &&
               items.size() <= 100 && // sinnvolle Obergrenze
               items.stream().allMatch(PosOrderItemRequest::isValid);
    }
}

package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response nach ADJUST oder REDEEM - gemeinsame Form, da beide Operationen
 * fachlich dasselbe zurückgeben (Punktestand vorher/nachher + Delta).
 * Für EARN (Einkauf) bleibt weiterhin {@link LoyaltyPurchaseResponse} zuständig.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyAdjustmentResponse {
    private Long loyaltyAccountId;
    private String customerName;
    /** 'ADJUST' | 'REDEEM' */
    private String type;
    /** Punkteänderung (positiv oder negativ) */
    private Integer points;
    private Integer previousBalance;
    private Integer newBalance;
    /** Grund (bei ADJUST) bzw. null (bei REDEEM) */
    private String note;
}

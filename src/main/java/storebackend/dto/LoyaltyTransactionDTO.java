package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Loyalty Transaction – Historie-Eintrag
 *
 * Projektion für die Transaktionshistorie eines LoyaltyAccount
 * (GET /api/stores/{storeId}/loyalty/accounts/{loyaltyAccountId}/transactions).
 * Nutzt {@link storebackend.entity.LoyaltyTransaction#getResultingBalance()},
 * das bereits als Punktestand-Snapshot NACH jeder Buchung gespeichert wird.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoyaltyTransactionDTO {
    private Long id;
    /** EARN | REDEEM | ADJUST */
    private String type;
    /** Punkteänderung (positiv bei EARN, negativ bei REDEEM, +/- bei ADJUST) */
    private Integer points;
    /** Einkaufswert, falls die Buchung aus einem Kauf stammt (sonst null) */
    private BigDecimal amount;
    /** Punktestand NACH dieser Buchung (Snapshot) */
    private Integer resultingBalance;
    /** Optionale Notiz (z.B. Grund bei ADJUST) */
    private String note;
    /** Bestehende Order-ID, falls die Buchung aus einem Kauf stammt (sonst null) */
    private Long orderId;
    private LocalDateTime createdAt;
}

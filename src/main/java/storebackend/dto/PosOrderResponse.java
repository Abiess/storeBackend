package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * POS Order Response
 * 
 * Response nach erfolgreichem POS-Verkauf
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PosOrderResponse {
    private Long orderId;
    private String orderNumber;
    private BigDecimal totalGross;
    private BigDecimal taxTotal;
    private BigDecimal cashChange; // NULL für CARD_EXTERNAL
    private OrderStatus status;
    private LocalDateTime createdAt;

    // ─── Loyalty (optional, nur gesetzt wenn loyaltyCode mitgeschickt wurde) ──
    /** Gutgeschriebene Punkte für diesen Einkauf (NULL wenn kein Loyalty-Code verwendet wurde) */
    private Integer loyaltyPointsEarned;
    /** Neuer Punktestand nach diesem Einkauf (NULL wenn kein Loyalty-Code verwendet wurde) */
    private Integer loyaltyNewBalance;

    // ─── Credit (optional, nur gesetzt bei paymentMethod=PAY_LATER) ───────────
    /** Neuer offener Betrag nach dieser PAY_LATER-Buchung (NULL bei CASH/CARD_EXTERNAL) */
    private BigDecimal creditNewBalance;
    
    // Constructor ohne cashChange (für CARD_EXTERNAL)
    public PosOrderResponse(Long orderId, String orderNumber, BigDecimal totalGross, 
                           BigDecimal taxTotal, OrderStatus status, LocalDateTime createdAt) {
        this.orderId = orderId;
        this.orderNumber = orderNumber;
        this.totalGross = totalGross;
        this.taxTotal = taxTotal;
        this.cashChange = null;
        this.status = status;
        this.createdAt = createdAt;
    }
}

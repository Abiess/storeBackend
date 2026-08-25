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

package storebackend.dto;

import lombok.Data;
import storebackend.entity.Address;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTO für Bestelldetails (vollständige Ansicht)
 */
@Data
public class OrderDetailsDTO {
    private Long id;
    private String orderNumber;
    private String status;
    private String trackingNumber;
    private BigDecimal totalAmount;
    private String notes;
    private String customerEmail;
    private CustomerDTO customer;
    private Address shippingAddress;
    private Address billingAddress;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime cancelledAt;
    private List<OrderItemDTO> items;
    private List<Map<String, Object>> statusHistory;

    /**
     * Innere Klasse für Kundeninformationen
     */
    @Data
    public static class CustomerDTO {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
    }

    /**
     * Innere Klasse für Bestellpositionen
     */
    @Data
    public static class OrderItemDTO {
        private Long id;
        private String productName;
        private String variantName;
        private Integer quantity;
        private BigDecimal price;
        private BigDecimal subtotal;
        private String imageUrl;
    }
}

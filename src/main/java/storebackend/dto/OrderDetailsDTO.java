package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import storebackend.entity.Address;
import storebackend.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderDetailsDTO {
    private Long id;
    private String orderNumber;
    private String customerEmail;
    private OrderStatus status;
    private BigDecimal totalAmount;  // FIXED: totalAmount statt total
    private LocalDateTime createdAt;
    private CustomerDTO customer;
    private List<OrderItemDTO> items;
    private Address shippingAddress;  // FIXED: Hinzugefügt
    private Address billingAddress;   // FIXED: Hinzugefügt
    private String notes;             // FIXED: Hinzugefügt

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerDTO {
        private Long id;
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItemDTO {
        private Long id;
        private String productName;
        private String variantName;
        private Integer quantity;
        private BigDecimal price;      // FIXED: price statt priceAtOrder
        private BigDecimal subtotal;
    }
}

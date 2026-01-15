package storebackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
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
    private BigDecimal total;
    private LocalDateTime createdAt;
    private CustomerDTO customer;
    private List<OrderItemDTO> items;

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
        private BigDecimal priceAtOrder;
        private BigDecimal subtotal;
    }
}

package storebackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.Order;
import storebackend.entity.OrderItem;
import storebackend.entity.User;
import storebackend.service.OrderService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public/customer")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CustomerOrderController {

    private final OrderService orderService;

    @GetMapping("/orders")
    public ResponseEntity<?> getCustomerOrders() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                    .body(new ErrorResponse("User not authenticated"));
            }

            User user = (User) authentication.getPrincipal();
            List<Order> orders = orderService.getOrdersByCustomer(user.getId());

            // Konvertiere zu DTO mit allen benötigten Feldern
            List<Map<String, Object>> orderDTOs = orders.stream().map(order -> {
                Map<String, Object> dto = new HashMap<>();
                dto.put("id", order.getId());
                dto.put("orderNumber", order.getOrderNumber());
                dto.put("status", order.getStatus().name());
                dto.put("totalAmount", order.getTotalAmount());
                dto.put("createdAt", order.getCreatedAt().toString());

                // Hole Order Items
                List<OrderItem> items = orderService.getOrderItems(order.getId());
                dto.put("items", items.stream().map(item -> {
                    Map<String, Object> itemDto = new HashMap<>();
                    itemDto.put("id", item.getId());
                    itemDto.put("productName", item.getProductName());
                    itemDto.put("quantity", item.getQuantity());
                    itemDto.put("price", item.getPrice());
                    return itemDto;
                }).collect(Collectors.toList()));

                return dto;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(orderDTOs);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ErrorResponse("Error fetching orders: " + e.getMessage()));
        }
    }

    @GetMapping("/orders/{orderNumber}")
    public ResponseEntity<?> getOrderByNumber(@PathVariable String orderNumber) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                    .body(new ErrorResponse("User not authenticated"));
            }

            User user = (User) authentication.getPrincipal();
            Order order = orderService.getOrderByNumber(orderNumber);

            // Prüfe, ob die Bestellung dem Kunden gehört
            if (order.getCustomer() == null || !order.getCustomer().getId().equals(user.getId())) {
                return ResponseEntity.status(403)
                    .body(new ErrorResponse("Access denied"));
            }

            // Erstelle vollständiges Order-DTO
            Map<String, Object> orderDto = new HashMap<>();
            orderDto.put("id", order.getId());
            orderDto.put("orderNumber", order.getOrderNumber());
            orderDto.put("status", order.getStatus().name());
            orderDto.put("totalAmount", order.getTotalAmount());
            orderDto.put("createdAt", order.getCreatedAt().toString());

            // Hole Order Items
            List<OrderItem> items = orderService.getOrderItems(order.getId());
            orderDto.put("items", items.stream().map(item -> {
                Map<String, Object> itemDto = new HashMap<>();
                itemDto.put("id", item.getId());
                itemDto.put("productName", item.getProductName());
                itemDto.put("quantity", item.getQuantity());
                itemDto.put("price", item.getPrice());
                return itemDto;
            }).collect(Collectors.toList()));

            return ResponseEntity.ok(orderDto);
        } catch (RuntimeException e) {
            return ResponseEntity.status(404)
                .body(new ErrorResponse("Order not found"));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ErrorResponse("Error fetching order: " + e.getMessage()));
        }
    }

    private record ErrorResponse(String message) {}
}


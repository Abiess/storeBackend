package storebackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.CustomerProfile;
import storebackend.entity.Order;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.CustomerAccountMode;
import storebackend.enums.OrderStatus;
import storebackend.enums.PaymentMethod;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.OrderItemRepository;
import storebackend.repository.OrderRepository;
import storebackend.security.JwtUtil;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InviteOnlyOrderControllerTest {
    @Mock JwtUtil jwtUtil;
    @Mock CustomerProfileRepository profiles;
    @Mock OrderRepository orders;
    @Mock OrderItemRepository items;

    private InviteOnlyOrderController controller;

    @BeforeEach
    void setup() {
        controller = new InviteOnlyOrderController(jwtUtil, profiles, orders, items);
    }

    @Test
    void rejectsMissingLoginBeforeReadingOrders() {
        assertEquals(401, controller.list(121L, null).getStatusCode().value());
        verifyNoInteractions(profiles, orders);
    }

    @Test
    void rejectsCustomersOutsideTheStore() {
        authenticate(11L);
        when(profiles.findByUserIdAndStoreId(11L, 121L)).thenReturn(Optional.empty());

        assertEquals(403, controller.list(121L, "Bearer valid").getStatusCode().value());
        verifyNoInteractions(orders);
    }

    @Test
    void listsOnlyRequestsFromTheSelectedStore() {
        authenticate(11L);
        invitedProfile(11L, 121L);
        Order request = order(11L, 121L, PaymentMethod.ORDER_REQUEST);
        Order normalOrder = order(11L, 121L, PaymentMethod.CASH_ON_DELIVERY);
        when(orders.findByCustomerIdAndStoreIdOrderByCreatedAtDesc(11L, 121L))
            .thenReturn(List.of(request, normalOrder));
        when(items.findByOrderId(request.getId())).thenReturn(List.of());

        var response = controller.list(121L, "Bearer valid");
        assertEquals(200, response.getStatusCode().value());
        var result = (List<?>) response.getBody();
        assertEquals(1, result.size());
        assertEquals(request.getOrderNumber(), ((InviteOnlyOrderController.OrderSummary) result.get(0)).orderNumber());
    }

    @Test
    void doesNotShowAnotherCustomersOrderDetails() {
        authenticate(11L);
        invitedProfile(11L, 121L);
        Order other = order(12L, 121L, PaymentMethod.ORDER_REQUEST);
        when(orders.findByOrderNumber(other.getOrderNumber())).thenReturn(Optional.of(other));

        assertEquals(404, controller.detail(121L, other.getOrderNumber(), "Bearer valid")
            .getStatusCode().value());
        verifyNoInteractions(items);
    }

    private void authenticate(Long userId) {
        when(jwtUtil.extractEmail("valid")).thenReturn("invite@customer.invalid");
        when(jwtUtil.validateToken("valid", "invite@customer.invalid")).thenReturn(true);
        when(jwtUtil.extractUserId("valid")).thenReturn(userId);
    }

    private void invitedProfile(Long userId, Long storeId) {
        Store store = new Store();
        store.setId(storeId);
        store.setCustomerAccountMode(CustomerAccountMode.INVITE_ONLY);
        CustomerProfile profile = new CustomerProfile();
        profile.setStore(store);
        when(profiles.findByUserIdAndStoreId(userId, storeId)).thenReturn(Optional.of(profile));
    }

    private Order order(Long customerId, Long storeId, PaymentMethod method) {
        User user = new User();
        user.setId(customerId);
        Store store = new Store();
        store.setId(storeId);
        Order order = new Order();
        order.setId(101L);
        order.setOrderNumber("ORD-101");
        order.setCustomer(user);
        order.setStore(store);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMethod(method);
        order.setTotalAmount(new BigDecimal("12.50"));
        order.setCreatedAt(LocalDateTime.now());
        return order;
    }
}

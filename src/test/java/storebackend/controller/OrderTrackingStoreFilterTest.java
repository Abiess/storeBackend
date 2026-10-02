package storebackend.controller;

import org.junit.jupiter.api.Test;
import storebackend.repository.OrderRepository;
import storebackend.repository.OrderItemRepository;
import storebackend.repository.UserRepository;
import storebackend.service.AuthService;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

class OrderTrackingStoreFilterTest {
    @Test
    void scopedHistoryUsesAuthenticatedCustomerAndRequestedStore() {
        OrderRepository orders = mock(OrderRepository.class);
        AuthService auth = mock(AuthService.class);
        when(auth.getUserIdFromToken("customer")).thenReturn(42L);
        when(orders.findByCustomerIdAndStoreIdOrderByCreatedAtDesc(42L, 7L)).thenReturn(List.of());
        var controller = new OrderTrackingController(orders, mock(UserRepository.class),
            auth, mock(OrderItemRepository.class));
        assertEquals(200, controller.getCustomerOrders("Bearer customer", 7L).getStatusCode().value());
        verify(orders).findByCustomerIdAndStoreIdOrderByCreatedAtDesc(42L, 7L);
        verify(orders, never()).findByCustomerId(anyLong());
    }

    @Test
    void unfilteredHistoryRemainsCompatible() {
        OrderRepository orders = mock(OrderRepository.class);
        AuthService auth = mock(AuthService.class);
        when(auth.getUserIdFromToken("customer")).thenReturn(42L);
        when(orders.findByCustomerId(42L)).thenReturn(List.of());
        var controller = new OrderTrackingController(orders, mock(UserRepository.class),
            auth, mock(OrderItemRepository.class));
        assertEquals(200, controller.getCustomerOrders("Bearer customer", null).getStatusCode().value());
        verify(orders).findByCustomerId(42L);
    }

    @Test
    void missingAuthenticationNeverQueriesOrders() {
        OrderRepository orders = mock(OrderRepository.class);
        var controller = new OrderTrackingController(orders, mock(UserRepository.class),
            mock(AuthService.class), mock(OrderItemRepository.class));
        assertEquals(401, controller.getCustomerOrders(null, 7L).getStatusCode().value());
        verifyNoInteractions(orders);
    }
}

package storebackend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.*;
import storebackend.dto.OrderDetailsDTO;
import storebackend.entity.*;
import storebackend.enums.*;
import storebackend.repository.*;
import storebackend.service.AuthService;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrderTrackingDetailsTest {
    private final OrderRepository orders = mock(OrderRepository.class);
    private final OrderItemRepository items = mock(OrderItemRepository.class);
    private final AuthService auth = mock(AuthService.class);
    private final OrderTrackingController target = new OrderTrackingController(
        orders, mock(UserRepository.class), auth, items);

    private Order order(Store store) {
        var customer = new User(); customer.setId(42L);
        var order = new Order();
        order.setId(1L); order.setOrderNumber("ORD-1");
        order.setStore(store); order.setCustomer(customer);
        order.setStatus(OrderStatus.PENDING); order.setCreatedAt(LocalDateTime.now());
        when(orders.findByOrderNumber("ORD-1")).thenReturn(Optional.of(order));
        when(auth.getUserIdFromToken("valid")).thenReturn(42L);
        return order;
    }

    @Test void inviteDetailsLoadLazyStoreInsideReadOnlyTransaction() {
        var store = mock(Store.class);
        when(store.getCustomerAccountMode()).thenAnswer(invocation -> {
            if (!TransactionSynchronizationManager.isActualTransactionActive()) {
                throw new org.hibernate.LazyInitializationException("Detached store");
            }
            assertTrue(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            return CustomerAccountMode.INVITE_ONLY;
        });
        order(store);
        when(items.findByOrderId(1L)).thenReturn(List.of());
        var proxy = new ProxyFactory(target);
        proxy.setProxyTargetClass(true);
        proxy.addAdvice(new TransactionInterceptor(new TestTransactions(),
            new AnnotationTransactionAttributeSource()));
        var controller = (OrderTrackingController) proxy.getProxy();
        var response = controller.getOrderDetails("ORD-1", "Bearer valid");
        assertEquals(200, response.getStatusCode().value());
        assertEquals("ORD-1", ((OrderDetailsDTO) response.getBody()).getOrderNumber());
    }

    @Test void missingOrderAloneReturns404() {
        when(orders.findByOrderNumber("missing")).thenReturn(Optional.empty());
        assertEquals(404, target.getOrderDetails("missing", null).getStatusCode().value());
        verifyNoInteractions(items);
    }

    @Test void repositoryFailureReturns500RatherThanFalseNotFound() {
        when(orders.findByOrderNumber("ORD-1")).thenThrow(new IllegalStateException("database error"));
        assertEquals(500, target.getOrderDetails("ORD-1", null).getStatusCode().value());
    }

    @Test void mappingFailureReturns500RatherThanFalseNotFound() {
        var store = new Store(); store.setCustomerAccountMode(CustomerAccountMode.INVITE_ONLY);
        order(store);
        when(items.findByOrderId(1L)).thenThrow(new IllegalStateException("mapping failed"));
        assertEquals(500, target.getOrderDetails("ORD-1", "Bearer valid").getStatusCode().value());
    }

    @Test void inviteOrderStillRequiresItsAuthenticatedCustomer() {
        var store = new Store(); store.setCustomerAccountMode(CustomerAccountMode.INVITE_ONLY);
        order(store);
        assertEquals(401, target.getOrderDetails("ORD-1", null).getStatusCode().value());
        when(auth.getUserIdFromToken("other")).thenReturn(99L);
        assertEquals(403, target.getOrderDetails("ORD-1", "Bearer other").getStatusCode().value());
        verifyNoInteractions(items);
    }

    private static class TestTransactions extends AbstractPlatformTransactionManager {
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object transaction, org.springframework.transaction.TransactionDefinition definition) {}
        @Override protected void doCommit(DefaultTransactionStatus status) {}
        @Override protected void doRollback(DefaultTransactionStatus status) {}
    }
}

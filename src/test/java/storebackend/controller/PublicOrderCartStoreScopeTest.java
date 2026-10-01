package storebackend.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.Store;
import storebackend.repository.CartItemRepository;
import storebackend.repository.CartRepository;
import storebackend.repository.CustomerProfileRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.service.OrderService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PublicOrderCartStoreScopeTest {
    @Mock OrderService orders;
    @Mock CartRepository carts;
    @Mock CartItemRepository items;
    @Mock CustomerProfileRepository profiles;
    @Mock StoreRepository stores;
    @Mock UserRepository users;
    @Mock JwtUtil jwt;
    @InjectMocks PublicOrderController controller;

    @Test
    void checkoutDoesNotUseCartFromAnotherStore() {
        Store requestedStore = new Store();
        requestedStore.setId(130L);
        when(stores.findById(130L)).thenReturn(Optional.of(requestedStore));
        when(jwt.extractUserId("token")).thenReturn(41L);
        when(jwt.extractEmail("token")).thenReturn("customer@example.com");
        when(jwt.validateToken("token", "customer@example.com")).thenReturn(true);
        when(carts.findByUserIdAndStoreIdAndNotExpired(eq(41L), eq(130L), any(LocalDateTime.class)))
                .thenReturn(List.of());

        var response = controller.checkout(Map.of("storeId", 130L, "paymentMethod", "CASH_ON_DELIVERY"), "Bearer token");

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Cart not found. Please add items to cart first.", response.getBody().get("error"));
        verify(carts).findByUserIdAndStoreIdAndNotExpired(eq(41L), eq(130L), any(LocalDateTime.class));
        verifyNoInteractions(items, orders);
    }
}

package storebackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import storebackend.entity.Cart;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.CartItemRepository;
import storebackend.repository.CartRepository;
import storebackend.repository.ProductRepository;
import storebackend.repository.ProductVariantRepository;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceStoreScopeTest {
    @Mock CartRepository carts;
    @Mock CartItemRepository items;
    @Mock ProductVariantRepository variants;
    @Mock ProductRepository products;
    @Mock ProductTierPriceService tierPrices;
    @InjectMocks CartService service;

    @Test
    void sameUserKeepsSeparateCartsForDifferentStores() {
        User user = new User();
        user.setId(41L);
        Store first = new Store();
        first.setId(121L);
        Store second = new Store();
        second.setId(130L);
        Cart firstCart = new Cart();
        firstCart.setId(12L);
        firstCart.setUser(user);
        firstCart.setStore(first);

        when(carts.findByUserIdAndStoreIdAndNotExpired(eq(41L), eq(121L), any(LocalDateTime.class)))
                .thenReturn(List.of(firstCart));
        when(carts.findByUserIdAndStoreIdAndNotExpired(eq(41L), eq(130L), any(LocalDateTime.class)))
                .thenReturn(List.of());
        when(carts.save(any(Cart.class))).thenAnswer(invocation -> {
            Cart cart = invocation.getArgument(0);
            cart.setId(13L);
            return cart;
        });

        assertEquals(firstCart, service.getOrCreateCart(null, user, first));
        Cart secondCart = service.getOrCreateCart(null, user, second);
        assertNotEquals(firstCart.getId(), secondCart.getId());
        assertEquals(130L, secondCart.getStore().getId());
        verify(carts).findByUserIdAndStoreIdAndNotExpired(eq(41L), eq(130L), any(LocalDateTime.class));
    }

    @Test
    void cartReadUsesTheRequestedStore() {
        Store second = new Store();
        second.setId(130L);
        Cart cart = new Cart();
        cart.setId(13L);
        cart.setStore(second);
        when(carts.findByUserIdAndStoreIdAndNotExpired(eq(41L), eq(130L), any(LocalDateTime.class)))
                .thenReturn(List.of(cart));
        when(items.findByCartId(13L)).thenReturn(List.of());

        assertEquals(cart, service.loadCartWithItemsForDisplay(null, 41L, 130L).cart);
        assertEquals(cart, service.getCartByUser(41L, 130L));
    }
}

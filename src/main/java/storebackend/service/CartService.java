package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.*;
import storebackend.repository.CartItemRepository;
import storebackend.repository.CartRepository;
import storebackend.repository.ProductVariantRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CartService {
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductVariantRepository productVariantRepository;

    @Transactional
    public Cart getOrCreateCart(String sessionId, User user, Store store) {
        if (user != null) {
            return cartRepository.findByUserId(user.getId())
                    .orElseGet(() -> createCartSafely(null, user, store));
        } else {
            // Versuche zuerst den existierenden Cart zu finden
            Optional<Cart> existingCart = cartRepository.findBySessionId(sessionId);
            if (existingCart.isPresent()) {
                log.info("✅ Existierender Cart gefunden für sessionId: {}", sessionId);
                return existingCart.get();
            }
            // Wenn nicht gefunden, erstelle neuen Cart mit Fehlerbehandlung
            return createCartSafely(sessionId, null, store);
        }
    }

    @Transactional
    public Cart getCartBySessionId(String sessionId) {
        return cartRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));
    }

    @Transactional
    public Cart getCartByUser(Long userId) {
        return cartRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));
    }

    @Transactional
    public List<CartItem> getCartItems(Long cartId) {
        return cartItemRepository.findByCartId(cartId);
    }

    @Transactional
    public CartItem addItemToCart(Long cartId, Long variantId, Integer quantity) {
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        ProductVariant variant = productVariantRepository.findById(variantId)
                .orElseThrow(() -> new RuntimeException("Product variant not found"));

        // Check if item already exists in cart
        Optional<CartItem> existingItem = cartItemRepository.findByCartIdAndVariantId(cartId, variantId);

        if (existingItem.isPresent()) {
            // Update quantity
            CartItem item = existingItem.get();
            item.setQuantity(item.getQuantity() + quantity);
            return cartItemRepository.save(item);
        } else {
            // Create new item
            CartItem item = new CartItem();
            item.setCart(cart);
            item.setVariant(variant);
            item.setQuantity(quantity);
            item.setPriceSnapshot(variant.getPrice());
            return cartItemRepository.save(item);
        }
    }

    @Transactional
    public CartItem updateCartItemQuantity(Long itemId, Integer quantity) {
        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Cart item not found"));

        if (quantity <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }

        item.setQuantity(quantity);
        return cartItemRepository.save(item);
    }

    @Transactional
    public void removeCartItem(Long itemId) {
        cartItemRepository.deleteById(itemId);
    }

    @Transactional
    public void clearCart(Long cartId) {
        cartItemRepository.deleteByCartId(cartId);
    }

    @Transactional
    public void deleteExpiredCarts() {
        cartRepository.deleteByExpiresAtBefore(LocalDateTime.now());
    }

    /**
     * Migriert einen Gast-Warenkorb zu einem Benutzer-Warenkorb
     * @param sessionId Die Session-ID des Gast-Warenkorbs
     * @param user Der Benutzer, zu dem der Warenkorb migriert werden soll
     * @return Der migrierte oder zusammengeführte Warenkorb
     */
    @Transactional
    public Cart mergeGuestCartToUser(String sessionId, User user) {
        if (sessionId == null || user == null) {
            log.warn("⚠️ Warenkorb-Migration abgebrochen: sessionId oder user ist null");
            return null;
        }

        // Finde den Gast-Warenkorb
        Optional<Cart> guestCartOpt = cartRepository.findBySessionId(sessionId);
        if (guestCartOpt.isEmpty()) {
            log.info("ℹ️ Kein Gast-Warenkorb gefunden für sessionId: {}", sessionId);
            return null;
        }

        Cart guestCart = guestCartOpt.get();
        List<CartItem> guestItems = cartItemRepository.findByCartId(guestCart.getId());

        if (guestItems.isEmpty()) {
            log.info("ℹ️ Gast-Warenkorb ist leer, lösche ihn");
            cartRepository.delete(guestCart);
            return null;
        }

        // Prüfe ob der Benutzer bereits einen Warenkorb hat
        Optional<Cart> userCartOpt = cartRepository.findByUserId(user.getId());
        Cart userCart;

        if (userCartOpt.isPresent()) {
            // Benutzer hat bereits einen Warenkorb - Artikel zusammenführen
            userCart = userCartOpt.get();
            log.info("🔄 Führe Gast-Warenkorb ({} Artikel) mit Benutzer-Warenkorb zusammen", guestItems.size());

            for (CartItem guestItem : guestItems) {
                Optional<CartItem> existingItem = cartItemRepository.findByCartIdAndVariantId(
                        userCart.getId(),
                        guestItem.getVariant().getId()
                );

                if (existingItem.isPresent()) {
                    // Artikel existiert bereits - erhöhe die Menge
                    CartItem item = existingItem.get();
                    item.setQuantity(item.getQuantity() + guestItem.getQuantity());
                    cartItemRepository.save(item);
                    log.info("➕ Menge erhöht für Artikel-ID: {}", item.getId());
                } else {
                    // Artikel existiert noch nicht - verschiebe ihn
                    guestItem.setCart(userCart);
                    cartItemRepository.save(guestItem);
                    log.info("📦 Artikel verschoben: {}", guestItem.getId());
                }
            }
        } else {
            // Benutzer hat noch keinen Warenkorb - konvertiere den Gast-Warenkorb
            log.info("🔄 Konvertiere Gast-Warenkorb zu Benutzer-Warenkorb");
            guestCart.setUser(user);
            guestCart.setSessionId(null); // Entferne die sessionId
            userCart = cartRepository.save(guestCart);
            log.info("✅ Warenkorb konvertiert für User-ID: {}", user.getId());
            return userCart;
        }

        // Lösche den alten Gast-Warenkorb
        cartRepository.delete(guestCart);
        log.info("🗑️ Gast-Warenkorb gelöscht");

        return userCart;
    }

    private Cart createCartSafely(String sessionId, User user, Store store) {
        try {
            return createCart(sessionId, user, store);
        } catch (DataIntegrityViolationException e) {
            // Wenn ein Duplicate Key Error auftritt, versuche den existierenden Cart zu laden
            log.warn("⚠️ Duplicate key beim Cart-Erstellen, lade existierenden Cart. SessionId: {}", sessionId);

            if (sessionId != null) {
                return cartRepository.findBySessionId(sessionId)
                        .orElseThrow(() -> new RuntimeException("Cart konnte nicht erstellt oder gefunden werden für sessionId: " + sessionId));
            } else if (user != null) {
                return cartRepository.findByUserId(user.getId())
                        .orElseThrow(() -> new RuntimeException("Cart konnte nicht erstellt oder gefunden werden für userId: " + user.getId()));
            }
            throw new RuntimeException("Cart konnte nicht erstellt werden", e);
        }
    }

    private Cart createCart(String sessionId, User user, Store store) {
        Cart cart = new Cart();
        cart.setSessionId(sessionId);
        cart.setUser(user);
        cart.setStore(store);
        cart.setExpiresAt(LocalDateTime.now().plusDays(7));
        log.info("🆕 Erstelle neuen Cart - sessionId: {}, userId: {}, storeId: {}", sessionId, user != null ? user.getId() : null, store.getId());
        return cartRepository.save(cart);
    }
}

package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.*;
import storebackend.repository.CartItemRepository;
import storebackend.repository.CartRepository;
import storebackend.repository.ProductRepository;
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
    private final ProductRepository productRepository;

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
        return addItemToCart(cartId, variantId, null, quantity);
    }

    @Transactional
    public CartItem addItemToCart(Long cartId, Long variantId, Long productId, Integer quantity) {
        Cart cart = cartRepository.findById(cartId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        if (variantId != null) {
            // Varianten-basierter Pfad
            ProductVariant variant = productVariantRepository.findById(variantId)
                    .orElseThrow(() -> new RuntimeException("Product variant not found"));

            Optional<CartItem> existingItem = cartItemRepository.findByCartIdAndVariantId(cartId, variantId);
            if (existingItem.isPresent()) {
                CartItem item = existingItem.get();
                item.setQuantity(item.getQuantity() + quantity);
                return cartItemRepository.save(item);
            } else {
                CartItem item = new CartItem();
                item.setCart(cart);
                item.setVariant(variant);
                item.setProduct(variant.getProduct());
                item.setQuantity(quantity);
                item.setPriceSnapshot(variant.getPrice());
                return cartItemRepository.save(item);
            }
        } else {
            // Produkt-basierter Pfad (keine Variante) → Default-Variante holen/erstellen
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            // Default-Variante für dieses Produkt holen oder anlegen
            ProductVariant defaultVariant = getOrCreateDefaultVariant(product);

            Optional<CartItem> existingItem = cartItemRepository.findByCartIdAndVariantId(cartId, defaultVariant.getId());
            if (existingItem.isPresent()) {
                CartItem item = existingItem.get();
                item.setQuantity(item.getQuantity() + quantity);
                return cartItemRepository.save(item);
            } else {
                CartItem item = new CartItem();
                item.setCart(cart);
                item.setProduct(product);
                item.setVariant(defaultVariant);
                item.setQuantity(quantity);
                item.setPriceSnapshot(product.getBasePrice() != null ? product.getBasePrice() : defaultVariant.getPrice());
                return cartItemRepository.save(item);
            }
        }
    }

    /**
     * Holt oder erstellt eine Default-Variante für ein Produkt ohne Varianten.
     * Stellt sicher, dass variant_id NOT NULL niemals verletzt wird.
     * FIXED: Ersetzt findAll()-Tabellenscan durch gezielten DB-Lookup (product_id + sku).
     */
    private ProductVariant getOrCreateDefaultVariant(Product product) {
        String defaultSku = "DEFAULT-" + product.getId();
        return productVariantRepository.findByProduct_IdAndSku(product.getId(), defaultSku)
                .orElseGet(() -> {
                    ProductVariant variant = new ProductVariant();
                    variant.setProduct(product);
                    variant.setSku(defaultSku);
                    variant.setPrice(product.getBasePrice() != null ? product.getBasePrice() : java.math.BigDecimal.ZERO);
                    variant.setStockQuantity(999);
                    log.info("✅ Erstelle Default-Variante für Produkt {}", product.getId());
                    return productVariantRepository.save(variant);
                });
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
     * REQUIRES_NEW sorgt dafür, dass diese Methode in einer separaten Transaktion läuft
     * und Fehler nicht die übergeordnete Transaktion beeinflussen
     * @param sessionId Die Session-ID des Gast-Warenkorbs
     * @param user Der Benutzer, zu dem der Warenkorb migriert werden soll
     * @return Der migrierte oder zusammengeführte Warenkorb
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public Cart mergeGuestCartToUser(String sessionId, User user) {
        if (sessionId == null || user == null) {
            log.warn("⚠️ Warenkorb-Migration abgebrochen: sessionId oder user ist null");
            return null;
        }

        try {
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
        } catch (Exception e) {
            log.error("❌ Fehler bei Warenkorb-Migration: {}", e.getMessage(), e);
            // Gib null zurück, damit die übergeordnete Transaktion nicht fehlschlägt
            return null;
        }
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

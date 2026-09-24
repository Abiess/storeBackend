package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Cart;
import storebackend.entity.CartItem;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.CartItemRepository;
import storebackend.repository.CartRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cart-Lifecycle-Verarbeitung:
 *  - Cleanup: Löscht abgelaufene Warenkörbe (expiresAt &lt; now) inkl. Items.
 *  - Reminder: Sendet einmalige Abandoned-Cart-E-Mails an eingeloggte Kunden,
 *              deren Warenkorb seit X Stunden nicht mehr aktualisiert wurde.
 *
 * Wird vom CartCleanupScheduler aufgerufen.
 * Wiederverwendete Bausteine:
 *  - {@link CartRepository} (vorhandene Methoden + neue {@code findAbandonedCarts})
 *  - {@link CartItemRepository#findByCartId} / {@link CartItemRepository#deleteByCartId}
 *  - {@link EmailService#sendAbandonedCartReminder}
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CartCleanupService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final EmailService emailService;

    /**
     * Löscht alle Warenkörbe deren {@code expiresAt} überschritten ist.
     * Items werden zuerst gelöscht (FK-Constraint), dann der Cart selbst.
     */
    @Transactional
    public int cleanupExpiredCarts() {
        LocalDateTime now = LocalDateTime.now();
        List<Cart> expired = cartRepository.findByExpiresAtBefore(now);
        if (expired.isEmpty()) {
            log.debug("[CartCleanup] Keine abgelaufenen Warenkörbe gefunden.");
            return 0;
        }
        int deleted = 0;
        for (Cart cart : expired) {
            try {
                cartItemRepository.deleteByCartId(cart.getId());
                cartRepository.delete(cart);
                deleted++;
            } catch (Exception e) {
                log.error("[CartCleanup] Fehler beim Löschen von Cart {}: {}", cart.getId(), e.getMessage());
            }
        }
        log.info("[CartCleanup] {} abgelaufene Warenkörbe gelöscht (von {} gefundenen).", deleted, expired.size());
        return deleted;
    }

    /**
     * Sendet Abandoned-Cart-Erinnerungen.
     * Kandidaten: eingeloggter User, mind. 1 Item, seit {@code idleHours} h inaktiv,
     * noch nicht abgelaufen, noch keine Erinnerung gesendet.
     *
     * Markiert {@code reminderSentAt} damit jeder Cart nur EINMAL erinnert wird.
     */
    @Transactional
    public int sendAbandonedCartReminders(int idleHours) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusHours(idleHours);
        List<Cart> abandoned = cartRepository.findAbandonedCarts(cutoff, now);
        if (abandoned.isEmpty()) {
            log.debug("[CartCleanup] Keine Abandoned-Carts (cutoff={}).", cutoff);
            return 0;
        }
        int sent = 0;
        for (Cart cart : abandoned) {
            try {
                if (sendReminderFor(cart)) {
                    cart.setReminderSentAt(now);
                    cartRepository.save(cart);
                    sent++;
                }
            } catch (Exception e) {
                log.error("[CartCleanup] Reminder fehlgeschlagen für Cart {}: {}", cart.getId(), e.getMessage());
            }
        }
        log.info("[CartCleanup] {} Abandoned-Cart-Reminder versendet (von {} Kandidaten).", sent, abandoned.size());
        return sent;
    }

    // ==============================================================
    // Private Helpers
    // ==============================================================

    private boolean sendReminderFor(Cart cart) {
        User user = cart.getUser();
        Store store = cart.getStore();
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return false;
        }
        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());
        if (items.isEmpty()) {
            return false;
        }

        BigDecimal total = BigDecimal.ZERO;
        List<Map<String, Object>> rows = new ArrayList<>();
        for (CartItem ci : items) {
            BigDecimal price = ci.getPrice() != null ? ci.getPrice() : BigDecimal.ZERO;
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(ci.getQuantity() != null ? ci.getQuantity() : 0));
            total = total.add(lineTotal);

            Map<String, Object> row = new HashMap<>();
            String name = ci.getProduct() != null ? ci.getProduct().getTitle() : "—";
            row.put("name", name);
            row.put("variantTitle", buildVariantTitle(ci));
            row.put("quantity", ci.getQuantity());
            row.put("price", String.format("%.2f", price.doubleValue()));
            row.put("total", String.format("%.2f", lineTotal.doubleValue()));
            row.put("currency", "MAD");
            rows.add(row);
        }

        String storeName = store != null ? store.getName() : "Markt.ma";
        String storeLogo = store != null ? store.getLogoUrl() : null;
        String lang = user.getPreferredLanguage() != null ? user.getPreferredLanguage() : "en";

        emailService.sendAbandonedCartReminder(
            user.getEmail(),
            user.getName(),
            storeName,
            storeLogo,
            items.size(),
            total.doubleValue(),
            "MAD",
            rows,
            null, // → Default-URL aus EmailService (baseUrl + "/cart")
            lang
        );
        return true;
    }

    /** Baut einen sprachneutralen Variant-Titel aus den Optionsfeldern. */
    private String buildVariantTitle(CartItem ci) {
        if (ci.getVariant() == null) return null;
        var v = ci.getVariant();
        StringBuilder sb = new StringBuilder();
        if (v.getOption1() != null && !v.getOption1().isBlank()) sb.append(v.getOption1());
        if (v.getOption2() != null && !v.getOption2().isBlank()) sb.append(sb.length() > 0 ? " / " : "").append(v.getOption2());
        if (v.getOption3() != null && !v.getOption3().isBlank()) sb.append(sb.length() > 0 ? " / " : "").append(v.getOption3());
        if (sb.length() == 0 && v.getSku() != null) return v.getSku();
        return sb.length() > 0 ? sb.toString() : null;
    }
}

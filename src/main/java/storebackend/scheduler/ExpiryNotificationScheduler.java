package storebackend.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreRepository;
import storebackend.service.WhatsAppService;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Täglicher Scheduler für MHD-Benachrichtigungen.
 * 
 * Prüft für jeden Store, welche Produkte bald ablaufen und sendet
 * eine Sammelnachricht per WhatsApp an den Store Manager.
 * 
 * Aktiviert über @EnableScheduling in {@link storebackend.StoreBackendApplication}.
 * 
 * Cron-Format: sec min hour day month weekday
 * Default: täglich 09:00 (konfigurierbar über app.expiry.cron)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ExpiryNotificationScheduler {

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final WhatsAppService whatsAppService;

    /**
     * Täglich 09:00 — MHD-Warnung für ablaufende Produkte.
     * Property: app.expiry.cron (default: 0 0 9 * * *)
     */
    @Scheduled(cron = "${app.expiry.cron:0 0 9 * * *}")
    public void checkExpiringProducts() {
        log.info("⏰ [Scheduler] MHD-Prüfung gestartet");
        try {
            checkAndNotifyExpiringProducts();
            log.info("✅ [Scheduler] MHD-Prüfung abgeschlossen");
        } catch (Exception e) {
            log.error("❌ [Scheduler] MHD-Prüfung fehlgeschlagen", e);
        }
    }

    /**
     * Hauptlogik: Prüft alle Stores und sendet Benachrichtigungen.
     * Public für Testbarkeit.
     */
    public void checkAndNotifyExpiringProducts() {
        LocalDate today = LocalDate.now();
        
        // Nur Stores mit WhatsApp-Nummer berücksichtigen
        List<Store> storesWithWhatsApp = storeRepository.findAllWithWhatsAppNumber();
        log.info("📋 [MHD] Prüfe {} Stores mit WhatsApp-Nummer", storesWithWhatsApp.size());

        int totalNotificationsSent = 0;
        int totalProductsNotified = 0;

        for (Store store : storesWithWhatsApp) {
            try {
                boolean notified = checkStoreProducts(store, today);
                if (notified) {
                    totalNotificationsSent++;
                    // Count wird in checkStoreProducts geloggt
                }
            } catch (Exception e) {
                log.error("❌ [MHD] Fehler bei Store {}: {}", store.getId(), e.getMessage(), e);
            }
        }

        if (totalNotificationsSent > 0) {
            log.info("📨 [MHD] {} Benachrichtigungen versendet", totalNotificationsSent);
        } else {
            log.info("📭 [MHD] Keine ablaufenden Produkte gefunden");
        }
    }

    /**
     * Prüft Produkte eines einzelnen Stores und sendet Benachrichtigung falls nötig.
     * 
     * @return true wenn Benachrichtigung gesendet wurde
     */
    private boolean checkStoreProducts(Store store, LocalDate today) {
        // Berechne Warnungsdatum basierend auf Store-Einstellung
        int daysBeforeExpiry = store.getExpiryNotificationDays() != null 
            ? store.getExpiryNotificationDays() 
            : 7;
        LocalDate warningDate = today.plusDays(daysBeforeExpiry);

        log.debug("🔍 [MHD] Store {}: Prüfe MHD zwischen {} und {} (Vorwarnzeit: {} Tage)",
            store.getId(), today, warningDate, daysBeforeExpiry);

        // Query: Produkte die bald ablaufen UND noch nicht benachrichtigt wurden
        List<Product> expiringProducts = productRepository.findExpiringProductsForNotification(
            store.getId(), today, warningDate
        );

        if (expiringProducts.isEmpty()) {
            log.debug("✓ [MHD] Store {}: Keine ablaufenden Produkte", store.getId());
            return false;
        }

        log.info("⚠️ [MHD] Store {}: {} Produkte laufen bald ab", 
            store.getId(), expiringProducts.size());

        // Sammelnachricht bauen
        String message = buildExpiryMessage(store, expiringProducts, today);

        // WhatsApp senden
        String ownerPhone = store.getWhatsappNumber();
        boolean success = whatsAppService.sendMessage(ownerPhone, message);

        if (success) {
            // WICHTIG: Im DEV Mode (whatsapp.enabled=false) gibt simulateSend() auch true zurück.
            // Um Tests wiederholbar zu machen, prüfen wir ob WhatsApp wirklich aktiviert ist.
            if (!whatsAppService.isEnabled()) {
                log.warn("⚠️ [MHD/DEV] Nachricht simuliert - Produkte werden NICHT als benachrichtigt markiert");
                log.warn("⚠️ [MHD/DEV] Für echte Benachrichtigungen: whatsapp.enabled=true setzen");
                return false; // Produkte bleiben testbar
            }
            
            log.info("✅ [MHD] Benachrichtigung gesendet an Store {} ({})", 
                store.getId(), ownerPhone);
            
            // Nur bei echtem Erfolg als benachrichtigt markieren
            markProductsAsNotified(expiringProducts);
            return true;
        } else {
            log.error("❌ [MHD] WhatsApp-Versand fehlgeschlagen für Store {}", store.getId());
            return false;
        }
    }

    /**
     * Baut die WhatsApp-Nachricht für ablaufende Produkte.
     * Mehrsprachig: de/en/ar (default: de)
     */
    private String buildExpiryMessage(Store store, List<Product> products, LocalDate today) {
        // Default: Deutsch (häufigstes Szenario basierend auf bestehenden WhatsApp-Patterns)
        String lang = "de";
        
        StringBuilder msg = new StringBuilder();
        
        // Kopfzeile
        switch (lang) {
            case "en":
                msg.append("⚠️ *Expiry Warning*\n\n");
                msg.append(products.size()).append(products.size() == 1 ? " product expires soon:\n\n" : " products expire soon:\n\n");
                break;
            case "ar":
                msg.append("⚠️ *تحذير انتهاء الصلاحية*\n\n");
                msg.append(products.size()).append(products.size() == 1 ? " منتج ينتهي قريباً:\n\n" : " منتجات تنتهي قريباً:\n\n");
                break;
            default: // de
                msg.append("⚠️ *MHD-Warnung*\n\n");
                msg.append(products.size()).append(products.size() == 1 ? " Produkt läuft bald ab:\n\n" : " Produkte laufen bald ab:\n\n");
        }

        // Produkt-Liste
        for (Product product : products) {
            msg.append("• *").append(product.getTitle()).append("*\n");
            
            // MHD-Datum
            LocalDate expiryDate = product.getExpiryDate();
            msg.append("  ");
            switch (lang) {
                case "en":
                    msg.append("Best before: ");
                    break;
                case "ar":
                    msg.append("تاريخ الانتهاء: ");
                    break;
                default:
                    msg.append("MHD: ");
            }
            msg.append(formatDate(expiryDate));
            
            // Verbleibende Tage
            long daysRemaining = ChronoUnit.DAYS.between(today, expiryDate);
            msg.append(" — ");
            switch (lang) {
                case "en":
                    msg.append(daysRemaining == 0 ? "*expires today!*" : 
                              daysRemaining == 1 ? "*1 day left*" : 
                              "*" + daysRemaining + " days left*");
                    break;
                case "ar":
                    msg.append(daysRemaining == 0 ? "*ينتهي اليوم!*" : 
                              daysRemaining == 1 ? "*يوم واحد متبقي*" : 
                              "*" + daysRemaining + " أيام متبقية*");
                    break;
                default:
                    msg.append(daysRemaining == 0 ? "*läuft heute ab!*" : 
                              daysRemaining == 1 ? "*noch 1 Tag*" : 
                              "*noch " + daysRemaining + " Tage*");
            }
            msg.append("\n\n");
        }

        // Fußzeile mit Store-Name
        if (store.getName() != null && !store.getName().isBlank()) {
            msg.append("—\n");
            msg.append(store.getName());
        }

        return msg.toString();
    }

    /**
     * Formatiert Datum für WhatsApp-Nachricht (dd.MM.yyyy).
     */
    private String formatDate(LocalDate date) {
        return String.format("%02d.%02d.%d", 
            date.getDayOfMonth(), 
            date.getMonthValue(), 
            date.getYear()
        );
    }

    /**
     * Markiert Produkte als benachrichtigt (Idempotenz).
     * lastExpiryNotificationDate = aktuelles expiryDate
     * → nächster Scheduler-Lauf überspringt diese Produkte
     */
    private void markProductsAsNotified(List<Product> products) {
        for (Product product : products) {
            product.setLastExpiryNotificationDate(product.getExpiryDate());
        }
        productRepository.saveAll(products);
        log.debug("✓ [MHD] {} Produkte als benachrichtigt markiert", products.size());
    }
}

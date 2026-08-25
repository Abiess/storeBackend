package storebackend.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.entity.TelegramStoreConfig;
import storebackend.entity.User;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.TelegramStoreConfigRepository;
import storebackend.service.NotificationRecipientService;
import storebackend.service.TelegramBotService;
import storebackend.service.WhatsAppService;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Täglicher Scheduler für MHD-Benachrichtigungen.
 * 
 * Prüft für jeden Store, welche Produkte bald ablaufen und sendet
 * eine Sammelnachricht per E-Mail, WhatsApp und/oder Telegram an den Store Manager.
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
    private final storebackend.service.EmailService emailService;
    private final TelegramBotService telegramBotService;
    private final TelegramStoreConfigRepository telegramStoreConfigRepository;
    private final NotificationRecipientService notificationRecipientService;

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
     * Sendet über drei Kanäle (E-Mail + WhatsApp + Telegram). Mindestens ein ECHTER Kanal
     * muss erfolgreich sein, damit Produkte als benachrichtigt markiert werden.
     * 
     * @return true wenn mindestens eine echte Benachrichtigung gesendet wurde
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

        // ═══════════════════════════════════════════════════════════════════════
        // KANAL 1: E-MAIL (Multi-User: Owner + Manager)
        // ═══════════════════════════════════════════════════════════════════════
        boolean emailSuccess = false;
        try {
            // Empfänger ermitteln (Owner + Manager, dedupliziert)
            List<User> recipients = notificationRecipientService.getMhdRecipients(store);
            
            if (recipients.isEmpty()) {
                log.warn("ℹ️ [MHD/Email] Store {} hat keine Empfänger (kein Owner/Manager)", store.getId());
            } else {
                log.info("📧 [MHD/Email] Store {}: {} Empfänger (Owner + Manager)", 
                    store.getId(), recipients.size());
                
                // Produkt-Liste für E-Mail vorbereiten (einmalig)
                List<Map<String, Object>> emailProducts = buildEmailProductList(expiringProducts, today);
                
                // E-Mail an jeden Empfänger einzeln versenden
                int successCount = 0;
                for (User recipient : recipients) {
                    try {
                        String recipientEmail = recipient.getEmail();
                        String recipientLang = recipient.getPreferredLanguage() != null 
                            ? recipient.getPreferredLanguage() 
                            : "en";
                        
                        if (recipientEmail == null || recipientEmail.isBlank()) {
                            log.warn("⚠️ [MHD/Email] Empfänger userId={} hat keine E-Mail-Adresse - überspringe", 
                                recipient.getId());
                            continue;
                        }
                        
                        boolean sent = emailService.sendExpiryWarning(
                            recipientEmail,
                            recipientLang,
                            store.getName(),
                            null, // storeLogo (optional)
                            emailProducts,
                            null  // manageUrl (default)
                        );
                        
                        if (sent) {
                            successCount++;
                            log.info("✅ [MHD/Email] Benachrichtigung gesendet an {} (userId={}, lang={})", 
                                recipientEmail, recipient.getId(), recipientLang);
                        } else {
                            log.warn("⚠️ [MHD/Email] Versand fehlgeschlagen oder DEV Mode für {} (userId={})", 
                                recipientEmail, recipient.getId());
                        }
                    } catch (Exception e) {
                        log.error("❌ [MHD/Email] Fehler beim Versand an userId={}: {}", 
                            recipient.getId(), e.getMessage(), e);
                        // Fehler bei einem Empfänger stoppt nicht die anderen
                    }
                }
                
                // Erfolg wenn mindestens 1 E-Mail erfolgreich versendet wurde
                emailSuccess = successCount > 0;
                
                if (emailSuccess) {
                    log.info("✅ [MHD/Email] Store {}: {}/{} E-Mails erfolgreich versendet", 
                        store.getId(), successCount, recipients.size());
                } else {
                    log.warn("⚠️ [MHD/Email] Store {}: Keine der {} E-Mails konnte versendet werden", 
                        store.getId(), recipients.size());
                }
            }
        } catch (Exception e) {
            log.error("❌ [MHD/Email] Fehler beim E-Mail-Versand für Store {}", store.getId(), e);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // KANAL 2: WHATSAPP (unabhängig)
        // ═══════════════════════════════════════════════════════════════════════
        boolean whatsappRealSuccess = false;
        try {
            String ownerPhone = store.getWhatsappNumber();
            if (ownerPhone != null && !ownerPhone.isBlank()) {
                // WhatsApp-Nachricht bauen
                String message = buildExpiryMessage(store, expiringProducts, today);
                
                boolean wapiSuccess = whatsAppService.sendMessage(ownerPhone, message);
                
                // Prüfen ob ECHTE Zustellung (nicht nur DEV-Simulation)
                if (wapiSuccess && whatsAppService.isEnabled()) {
                    whatsappRealSuccess = true;
                    log.info("✅ [MHD/WhatsApp] Benachrichtigung gesendet an {}", ownerPhone);
                } else if (wapiSuccess && !whatsAppService.isEnabled()) {
                    log.warn("⚠️ [MHD/WhatsApp] DEV Mode - Nachricht nur simuliert");
                } else {
                    log.error("❌ [MHD/WhatsApp] Versand fehlgeschlagen für {}", ownerPhone);
                }
            } else {
                log.debug("ℹ️ [MHD/WhatsApp] Store {} hat keine WhatsApp-Nummer", store.getId());
            }
        } catch (Exception e) {
            log.error("❌ [MHD/WhatsApp] Fehler beim WhatsApp-Versand für Store {}", store.getId(), e);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // KANAL 3: TELEGRAM (unabhängig)
        // ═══════════════════════════════════════════════════════════════════════
        boolean telegramRealSuccess = false;
        try {
            TelegramStoreConfig telegramCfg = telegramStoreConfigRepository
                .findByStoreId(store.getId())
                .orElse(null);
            
            if (telegramCfg != null && telegramBotService.isConfigured(telegramCfg)) {
                String ownerLang = store.getOwner() != null ? store.getOwner().getPreferredLanguage() : "en";
                
                boolean tgSuccess = telegramBotService.sendExpiryWarning(telegramCfg, expiringProducts, ownerLang);
                
                // Prüfen ob ECHTE Zustellung (nicht nur DEV-Simulation)
                if (tgSuccess && telegramBotService.isEnabled()) {
                    telegramRealSuccess = true;
                    log.info("✅ [MHD/Telegram] Benachrichtigung gesendet an Channel {}", telegramCfg.getChannelId());
                } else if (tgSuccess && !telegramBotService.isEnabled()) {
                    log.warn("⚠️ [MHD/Telegram] DEV Mode - Nachricht nur simuliert");
                } else {
                    log.error("❌ [MHD/Telegram] Versand fehlgeschlagen für Channel {}", telegramCfg.getChannelId());
                }
            } else {
                log.debug("ℹ️ [MHD/Telegram] Store {} hat keine Telegram-Konfiguration", store.getId());
            }
        } catch (Exception e) {
            log.error("❌ [MHD/Telegram] Fehler beim Telegram-Versand für Store {}", store.getId(), e);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // IDEMPOTENZ: Mindestens 1 ECHTER Kanal erfolgreich?
        // ═══════════════════════════════════════════════════════════════════════
        if (emailSuccess || whatsappRealSuccess || telegramRealSuccess) {
            log.info("✅ [MHD] Store {}: Mindestens 1 Kanal erfolgreich (E-Mail: {}, WhatsApp: {}, Telegram: {}) - Produkte werden markiert",
                store.getId(), emailSuccess, whatsappRealSuccess, telegramRealSuccess);
            markProductsAsNotified(expiringProducts);
            return true;
        } else {
            log.warn("⚠️ [MHD] Store {}: ALLE Kanäle fehlgeschlagen oder DEV Mode - Produkte bleiben unmarkiert (Retry möglich)",
                store.getId());
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
     * Baut die Produktliste für E-Mail-Template.
     * 
     * Jedes Produkt wird als Map mit folgenden Keys zurückgegeben:
     * - name: Produktname
     * - expiryDate: Formatiertes Datum (dd.MM.yyyy)
     * - daysRemaining: Text mit verbleibenden Tagen
     * - urgencyClass: CSS-Klasse (days-urgent / days-warning / days-ok)
     */
    private List<Map<String, Object>> buildEmailProductList(List<Product> products, LocalDate today) {
        List<Map<String, Object>> result = new ArrayList<>();
        
        for (Product product : products) {
            Map<String, Object> item = new HashMap<>();
            item.put("name", product.getTitle());
            item.put("expiryDate", formatDate(product.getExpiryDate()));
            
            long daysRemaining = ChronoUnit.DAYS.between(today, product.getExpiryDate());
            
            // Days Remaining Text
            String daysText;
            if (daysRemaining == 0) {
                daysText = "Expires today!";
            } else if (daysRemaining == 1) {
                daysText = "1 day left";
            } else {
                daysText = daysRemaining + " days left";
            }
            item.put("daysRemaining", daysText);
            
            // Urgency CSS Class
            String urgencyClass;
            if (daysRemaining <= 2) {
                urgencyClass = "days-urgent";  // Red
            } else if (daysRemaining <= 5) {
                urgencyClass = "days-warning"; // Orange
            } else {
                urgencyClass = "days-ok";      // Green
            }
            item.put("urgencyClass", urgencyClass);
            
            result.add(item);
        }
        
        return result;
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

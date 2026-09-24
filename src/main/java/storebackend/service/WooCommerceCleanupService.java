package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.CleanWooCommerceDescriptionsRequest;
import storebackend.dto.CleanWooCommerceDescriptionsResponse;
import storebackend.dto.CleanWooCommerceDescriptionsResponse.ProductCleanupPreview;
import storebackend.entity.Product;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.repository.ProductRepository;
import storebackend.repository.StoreRepository;
import storebackend.util.HtmlToTextConverter;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Service für Bereinigung von WooCommerce-Produktbeschreibungen.
 * 
 * Konvertiert bestehende HTML-Beschreibungen zu sauberem Klartext.
 * 
 * Transaktionsverhalten:
 * - TEILWEISE VERARBEITUNG (Variante A)
 * - Erfolgreiche Produkte werden gespeichert
 * - Fehlerhafte Produkte werden übersprungen
 * - Response zeigt updated + errors
 * - KEIN vollständiges Rollback bei einzelnen Fehlern
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WooCommerceCleanupService {

    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final HtmlToTextConverter htmlToTextConverter;
    private final StoreService storeService;

    /**
     * Pattern zum Erkennen von HTML-Tags in Beschreibungen.
     * Case-insensitive, erkennt auch Tags mit Attributen.
     */
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile(
        "<(p|br|div|ul|ol|li|table|thead|tbody|tr|td|th|h[1-6]|span|strong|em|b|i|a)(\\s|>|/)",
        Pattern.CASE_INSENSITIVE
    );

    /**
     * Maximale Anzahl von Produkten in der Response (Performance).
     */
    private static final int MAX_PREVIEW_PRODUCTS = 50;

    /**
     * Maximale Länge für before/after-Preview (Zeichen).
     */
    private static final int MAX_PREVIEW_LENGTH = 300;

    /**
     * Bereinigt WooCommerce-Produktbeschreibungen für einen oder alle Stores des Users.
     * 
     * Transaktionsverhalten:
     * - Pro-Produkt-Fehlerbehandlung: Fehlerhafte Produkte werden übersprungen
     * - Erfolgreiche Produkte werden gespeichert
     * - KEIN vollständiges Rollback bei einzelnen Produkt-Fehlern
     * 
     * @param request Request mit storeId (optional) und dryRun
     * @param user Authentifizierter User
     * @return Response mit Statistiken und Vorschau
     */
    @Transactional
    public CleanWooCommerceDescriptionsResponse cleanDescriptions(
            CleanWooCommerceDescriptionsRequest request,
            User user
    ) {
        long startTime = System.currentTimeMillis();
        
        log.info("🧹 Starting WooCommerce description cleanup for user {}, storeId={}, dryRun={}",
                user.getId(), request.getStoreId(), request.getDryRun());

        // 1. Validiere Berechtigungen und ermittle Stores
        List<Store> storesToClean = determineStores(request.getStoreId(), user);

        if (storesToClean.isEmpty()) {
            log.warn("⚠️ No stores found for cleanup (user={}, storeId={})", user.getId(), request.getStoreId());
            return CleanWooCommerceDescriptionsResponse.builder()
                    .checked(0)
                    .affected(0)
                    .updated(0)
                    .dryRun(request.getDryRun())
                    .errors(List.of("No accessible stores found"))
                    .build();
        }

        log.info("📂 Found {} accessible store(s) for user {}", storesToClean.size(), user.getId());

        // 2. Sammle WooCommerce-Produkte aus allen berechtigten Stores
        List<Product> productsToCheck = new ArrayList<>();
        for (Store store : storesToClean) {
            List<Product> storeProducts = productRepository.findByStoreIdWithCategory(store.getId());
            
            // Filter: Nur WooCommerce-Produkte mit Beschreibung
            storeProducts.stream()
                    .filter(p -> "WOOCOMMERCE".equals(p.getExternalSource()))
                    .filter(p -> p.getDescription() != null && !p.getDescription().isBlank())
                    .forEach(productsToCheck::add);
        }

        log.info("📦 Found {} WooCommerce products across {} stores", productsToCheck.size(), storesToClean.size());

        // 3. Bereinige Produkte
        CleanWooCommerceDescriptionsResponse response = cleanProducts(productsToCheck, request.getDryRun());

        // 4. Audit-Logging
        long duration = System.currentTimeMillis() - startTime;
        logAuditEntry(user, request, storesToClean, response, duration);

        return response;
    }

    /**
     * Ermittelt die zu bereinigenden Stores basierend auf Berechtigungen.
     */
    private List<Store> determineStores(Long requestedStoreId, User user) {
        List<Store> stores = new ArrayList<>();

        if (requestedStoreId != null) {
            // Spezifischer Store angefordert
            Store store = storeRepository.findById(requestedStoreId).orElse(null);
            if (store != null && hasStoreAccess(store, user)) {
                stores.add(store);
                log.info("✅ User {} has access to store {}", user.getId(), requestedStoreId);
            } else {
                log.warn("❌ User {} has NO access to store {}", user.getId(), requestedStoreId);
            }
        } else {
            // Alle Stores des Users
            try {
                stores = storeService.getStoresByUserId(user.getId());
                log.info("📂 User {} owns {} store(s)", user.getId(), stores.size());
            } catch (Exception e) {
                log.error("❌ Failed to get stores for user {}: {}", user.getId(), e.getMessage());
            }
        }

        return stores;
    }

    /**
     * Prüft, ob User Zugriff auf Store hat.
     */
    private boolean hasStoreAccess(Store store, User user) {
        // Owner hat immer Zugriff
        if (store.getOwner().getId().equals(user.getId())) {
            return true;
        }

        // TODO: Prüfe StoreRole für Mitarbeiter (falls implementiert)
        // Beispiel:
        // Optional<StoreRole> role = storeRoleRepository.findByStoreAndUser(store, user);
        // return role.isPresent() && role.get().hasPermission("EDIT_PRODUCTS");
        
        return false;
    }

    /**
     * Bereinigt eine Liste von Produkten.
     * 
     * Transaktionsverhalten:
     * - Pro-Produkt-Fehlerbehandlung
     * - Erfolgreiche Produkte werden einzeln gespeichert
     * - Fehlerhafte Produkte werden übersprungen (keine Exception nach außen)
     */
    private CleanWooCommerceDescriptionsResponse cleanProducts(List<Product> products, boolean dryRun) {
        CleanWooCommerceDescriptionsResponse.CleanWooCommerceDescriptionsResponseBuilder response = 
                CleanWooCommerceDescriptionsResponse.builder()
                        .checked(products.size())
                        .dryRun(dryRun);

        List<ProductCleanupPreview> previews = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int affectedCount = 0;
        int updatedCount = 0;

        for (Product product : products) {
            try {
                // Prüfe, ob Beschreibung HTML enthält
                String originalDescription = product.getDescription();
                
                if (!containsHtml(originalDescription)) {
                    // Bereits sauber, überspringen
                    continue;
                }

                affectedCount++;

                // Bereinige HTML zu Text
                String cleanedDescription = htmlToTextConverter.convert(originalDescription);

                // Sicherheitsprüfung: Kein null/leeres Ergebnis
                if (cleanedDescription == null || cleanedDescription.isBlank()) {
                    log.warn("⚠️ Cleaned description is empty for product {} ({}), skipping", 
                            product.getId(), product.getTitle());
                    errors.add(String.format("Product %d (%s): Cleaned description is empty, skipped",
                            product.getId(), truncate(product.getTitle(), 50)));
                    continue;
                }

                // Prüfe, ob sich tatsächlich etwas ändern würde
                boolean wouldChange = !cleanedDescription.equals(originalDescription);

                // Erstelle Vorschau (begrenzt auf MAX_PREVIEW_PRODUCTS)
                if (previews.size() < MAX_PREVIEW_PRODUCTS) {
                    ProductCleanupPreview preview = ProductCleanupPreview.builder()
                            .id(product.getId())
                            .title(truncate(product.getTitle(), 100))
                            .before(truncate(originalDescription, MAX_PREVIEW_LENGTH))
                            .after(truncate(cleanedDescription, MAX_PREVIEW_LENGTH))
                            .wouldChange(wouldChange)
                            .build();
                    previews.add(preview);
                }

                // Speichern (nur bei dryRun=false UND tatsächlicher Änderung)
                if (!dryRun && wouldChange) {
                    product.setDescription(cleanedDescription);
                    productRepository.save(product);
                    updatedCount++;
                    log.debug("✅ Updated product {} ({})", product.getId(), truncate(product.getTitle(), 50));
                }

            } catch (Exception e) {
                log.error("❌ Failed to clean product {} ({}): {}", 
                        product.getId(), product.getTitle(), e.getMessage());
                errors.add(String.format("Product %d (%s): %s", 
                        product.getId(), truncate(product.getTitle(), 50), e.getMessage()));
                // Fehler wird NICHT nach außen geworfen → nächstes Produkt wird verarbeitet
            }
        }

        // Warnung, wenn nicht alle Produkte in Vorschau
        if (affectedCount > MAX_PREVIEW_PRODUCTS) {
            log.info("ℹ️ Preview limited to {} products (total affected: {})", MAX_PREVIEW_PRODUCTS, affectedCount);
        }

        return response
                .affected(affectedCount)
                .updated(updatedCount)
                .products(previews)
                .errors(errors)
                .build();
    }

    /**
     * Prüft, ob String HTML-Tags enthält.
     * Case-insensitive, erkennt auch Tags mit Attributen.
     * 
     * Beispiele:
     * - <p>
     * - <P>
     * - <p class="nutrition">
     * - <div style="color:red">
     * - <br />
     */
    private boolean containsHtml(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        return HTML_TAG_PATTERN.matcher(text).find();
    }

    /**
     * Kürzt String auf maxLength Zeichen (ohne sensible Daten zu loggen).
     */
    private String truncate(String text, int maxLength) {
        if (text == null) {
            return "";
        }
        if (text.length() <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + "...";
    }

    /**
     * Audit-Logging für Admin-Bereinigung.
     * Protokolliert nur Metadaten, KEINE Produktbeschreibungen.
     */
    private void logAuditEntry(
            User user,
            CleanWooCommerceDescriptionsRequest request,
            List<Store> stores,
            CleanWooCommerceDescriptionsResponse response,
            long durationMs
    ) {
        String storeIds = stores.stream()
                .map(s -> s.getId().toString())
                .reduce((a, b) -> a + "," + b)
                .orElse("none");

        log.info("📊 AUDIT: WooCommerce cleanup completed | " +
                "user={} | " +
                "stores=[{}] | " +
                "dryRun={} | " +
                "checked={} | " +
                "affected={} | " +
                "updated={} | " +
                "errors={} | " +
                "duration={}ms",
                user.getId(),
                storeIds,
                request.getDryRun(),
                response.getChecked(),
                response.getAffected(),
                response.getUpdated(),
                response.getErrors().size(),
                durationMs
        );
    }
}

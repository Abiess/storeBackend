package storebackend.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.config.SaasProperties;
import storebackend.dto.CreateStoreRequest;
import storebackend.dto.UpdateStoreRequest;
import storebackend.dto.StoreDTO;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.Role;
import storebackend.enums.StoreStatus;
import storebackend.enums.BusinessType;
import storebackend.repository.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreService {

    @PersistenceContext
    private EntityManager entityManager;

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final MediaService mediaService;
    private final SaasProperties saasProperties;
    private final StorePostCreateService postCreateService;
    private final StarterPackService starterPackService;

    // NEUE: Liste der reservierten Slugs, die NICHT als Stores verwendet werden dürfen
    private static final Set<String> RESERVED_SLUGS = Set.of(
        // Technische Subdomains
        "api", "www", "admin", "app", "mail", "smtp", "ftp", "cdn",
        "static", "assets", "media", "images", "files",

        // Service-Subdomains
        "minio", "postgres", "redis", "mysql", "mongodb", "elasticsearch",

        // System-Subdomains
        "dashboard", "panel", "control", "status", "monitoring",
        "grafana", "prometheus",

        // Auth/Security
        "auth", "login", "register", "oauth", "sso",

        // Allgemeine reservierte
        "store", "shop", "marketplace", "test", "demo", "dev",
        "staging", "production", "beta", "alpha"
    );

    /**
     * Prüft, ob ein Slug reserviert ist
     */
    public boolean isReservedSlug(String slug) {
        if (slug == null) return true;
        return RESERVED_SLUGS.contains(slug.toLowerCase());
    }

    public List<StoreDTO> getStoresByOwner(User owner) {
        return storeRepository.findByOwner(owner).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Prüft, ob ein Slug noch verfügbar ist
     * @param slug Der zu prüfende Slug
     * @return true wenn verfügbar, false wenn bereits vergeben
     */
    public boolean isSlugAvailable(String slug) {
        if (slug == null || slug.trim().isEmpty()) {
            return false;
        }

        // NEUE: Prüfe auf reservierte Slugs
        if (isReservedSlug(slug)) {
            log.warn("Slug '{}' ist reserviert und kann nicht verwendet werden", slug);
            return false;
        }

        // Validiere Slug Format
        if (!slug.matches("^[a-z0-9-]+$")) {
            return false;
        }

        // Prüfe ob Slug bereits existiert
        return !storeRepository.existsBySlug(slug);
    }

    @Transactional
    public StoreDTO createStore(CreateStoreRequest request, User owner) {
        // NEUE: Prüfe auf reservierte Slugs
        if (isReservedSlug(request.getSlug())) {
            throw new RuntimeException("Slug '" + request.getSlug() + "' is reserved for technical purposes and cannot be used");
        }

        // Check max stores limit – immer frisch aus der DB zählen
        long currentStoreCount = storeRepository.countByOwner(owner);
        log.info("Store-Limit-Prüfung für User {} (Plan={}): {} von {} Stores genutzt",
                owner.getEmail(),
                owner.getPlan() != null ? owner.getPlan().getName() : "KEIN PLAN",
                currentStoreCount,
                owner.getPlan() != null ? owner.getPlan().getMaxStores() : "∞");

        if (owner.getPlan() != null) {
            int maxStores = owner.getPlan().getMaxStores() != null ? owner.getPlan().getMaxStores() : 0;
            // maxStores <= 0 → unbegrenzt (z. B. Enterprise-Plan mit -1)
            if (maxStores > 0 && currentStoreCount >= maxStores) {
                throw new RuntimeException("Maximum stores limit reached for your plan");
            }
        }

        // Check if slug already exists
        if (storeRepository.existsBySlug(request.getSlug())) {
            throw new RuntimeException("Slug already exists");
        }

        // Validiere Slug Format (nur alphanumerisch und Bindestriche)
        if (!request.getSlug().matches("^[a-z0-9-]+$")) {
            throw new RuntimeException("Slug can only contain lowercase letters, numbers and hyphens");
        }

        Store store = new Store();
        store.setOwner(owner);
        store.setName(request.getName());
        store.setSlug(request.getSlug());
        store.setStatus(StoreStatus.ACTIVE);
        if (request.getWhatsappNumber() != null && !request.getWhatsappNumber().isBlank()) {
            store.setWhatsappNumber(request.getWhatsappNumber().trim());
        }
        store.setWhatsappNotificationsEnabled(request.isWhatsappNotificationsEnabled());

        // Business-Typ (Default SHOP wenn nicht/ungültig gesetzt)
        if (request.getBusinessType() != null && !request.getBusinessType().isBlank()) {
            try {
                store.setBusinessType(BusinessType.valueOf(request.getBusinessType().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger businessType '{}' beim Erstellen – Default SHOP", request.getBusinessType());
            }
        }

        // ─── Währung & Steuern (Defaults in Entity) ─────────────────────────────────
        if (request.getCurrencyCode() != null && !request.getCurrencyCode().isBlank()) {
            try {
                store.setCurrencyCode(storebackend.enums.CurrencyCode.valueOf(request.getCurrencyCode().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger currencyCode '{}' – Default EUR", request.getCurrencyCode());
            }
        }
        if (request.getCountryCode() != null && !request.getCountryCode().isBlank()) {
            store.setCountryCode(request.getCountryCode().trim().toUpperCase());
        }
        if (request.getPriceMode() != null && !request.getPriceMode().isBlank()) {
            try {
                store.setPriceMode(storebackend.enums.PriceMode.valueOf(request.getPriceMode().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger priceMode '{}' – Default GROSS", request.getPriceMode());
            }
        }
        if (request.getVatEnabled() != null) {
            store.setVatEnabled(request.getVatEnabled());
        }
        if (request.getDefaultTaxRate() != null) {
            store.setDefaultTaxRate(request.getDefaultTaxRate());
        }
        if (request.getShippingTaxRate() != null) {
            store.setShippingTaxRate(request.getShippingTaxRate());
        }
        if (request.getShippingTaxStrategy() != null && !request.getShippingTaxStrategy().isBlank()) {
            try {
                store.setShippingTaxStrategy(storebackend.enums.ShippingTaxStrategy.valueOf(request.getShippingTaxStrategy().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger shippingTaxStrategy '{}' – Default STORE_DEFINED", request.getShippingTaxStrategy());
            }
        }

        store = storeRepository.save(store);

        // IMPORTANT: Flush to DB immediately to catch constraint violations NOW
        // This ensures any DB errors happen in THIS transaction, not in post-create operations
        storeRepository.flush();

        // Upgrade User zu RESELLER Rolle wenn noch nicht vorhanden
        if (!owner.getRoles().contains(Role.ROLE_RESELLER)) {
            Set<Role> roles = new HashSet<>(owner.getRoles());
            roles.add(Role.ROLE_RESELLER);
            owner.setRoles(roles);
            userRepository.save(owner);
            log.info("User {} upgraded to RESELLER role", owner.getEmail());
        }

        Long storeId = store.getId();

        // Optional: Starter-Pack-Content für RESTAURANT/RIAD vorbefüllen
        if (request.isSeedSampleData()) {
            try {
                starterPackService.cloneForBusinessType(store, store.getBusinessType());
            } catch (Exception e) {
                // Nicht kritisch – Store-Erstellung darf nicht scheitern
                log.warn("Starter-Pack-Klonen für Store {} fehlgeschlagen: {}", storeId, e.getMessage());
            }
        }

        // Bestimme Kategorie für Slider
        String category = determineStoreCategory(store.getName(), request.getDescription());
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            category = request.getCategory();
        }

        log.info("Store created successfully: {} (ID: {}) with subdomain {}.{}",
                store.getName(), store.getId(), store.getSlug(), saasProperties.getBaseDomain());

        StoreDTO result = toDTO(store);

        // WICHTIG: Transaktion endet HIER - Store wird committed
        // Post-Create-Operationen werden NACH dem Commit ausgeführt
        // Dies wird durch @TransactionalEventListener in StorePostCreateService gehandhabt
        // Alternativ: Expliziter Aufruf nach Transaktions-Ende
        final String finalCategory = category;
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
            new org.springframework.transaction.support.TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    // Wird NACH dem Commit ausgeführt
                    postCreateService.executePostCreateOperations(storeId, finalCategory);
                }
            }
        );

        return result;
    }


    @Transactional
    public StoreDTO updateStore(Long storeId, UpdateStoreRequest request, User user) {
        Store store = storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        // Verify ownership
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to update this store");
        }

        // Update name if provided
        if (request.getName() != null && !request.getName().isEmpty()) {
            store.setName(request.getName());
        }

        // Update slug if provided (optional beim Update)
        if (request.getSlug() != null && !request.getSlug().isEmpty()) {
            // Prüfe ob der neue Slug bereits von einem anderen Store verwendet wird
            if (!store.getSlug().equals(request.getSlug()) && storeRepository.existsBySlug(request.getSlug())) {
                throw new RuntimeException("Slug already exists");
            }

            // Validiere Slug Format
            if (!request.getSlug().matches("^[a-z0-9-]+$")) {
                throw new RuntimeException("Slug can only contain lowercase letters, numbers and hyphens");
            }

            store.setSlug(request.getSlug());
        }

        // Update description if provided
        if (request.getDescription() != null) {
            store.setDescription(request.getDescription());
        }

        // WhatsApp-Felder nur überschreiben wenn explizit mitgeliefert (null = nicht ändern)
        if (request.getWhatsappNumber() != null) {
            store.setWhatsappNumber(request.getWhatsappNumber().isBlank() ? null : request.getWhatsappNumber().trim());
        }
        if (request.getWhatsappNotificationsEnabled() != null) {
            store.setWhatsappNotificationsEnabled(request.getWhatsappNotificationsEnabled());
        }

        if (request.getGreetingMessage() != null) {
            store.setGreetingMessage(request.getGreetingMessage().isBlank() ? null : request.getGreetingMessage().trim());
        }

        // ─── Social Media & Kontakt-Links ─────────────────────────────
        if (request.getContactEmail() != null) {
            store.setContactEmail(request.getContactEmail().isBlank() ? null : request.getContactEmail().trim());
        }
        if (request.getContactPhone() != null) {
            store.setContactPhone(request.getContactPhone().isBlank() ? null : request.getContactPhone().trim());
        }
        if (request.getTelegramUrl() != null) {
            store.setTelegramUrl(request.getTelegramUrl().isBlank() ? null : request.getTelegramUrl().trim());
        }
        if (request.getFacebookUrl() != null) {
            store.setFacebookUrl(request.getFacebookUrl().isBlank() ? null : request.getFacebookUrl().trim());
        }
        if (request.getInstagramUrl() != null) {
            store.setInstagramUrl(request.getInstagramUrl().isBlank() ? null : request.getInstagramUrl().trim());
        }
        if (request.getTiktokUrl() != null) {
            store.setTiktokUrl(request.getTiktokUrl().isBlank() ? null : request.getTiktokUrl().trim());
        }
        if (request.getFooterText() != null) {
            store.setFooterText(request.getFooterText().isBlank() ? null : request.getFooterText().trim());
        }

        // ─── Business-Typ & Restaurant/Riad-Felder ──────────────────────
        if (request.getBusinessType() != null && !request.getBusinessType().isBlank()) {
            try {
                store.setBusinessType(BusinessType.valueOf(request.getBusinessType().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger businessType '{}' – ignoriert", request.getBusinessType());
            }
        }
        if (request.getOpeningHours() != null) {
            store.setOpeningHours(request.getOpeningHours().isBlank() ? null : request.getOpeningHours().trim());
        }
        if (request.getAddress() != null) {
            store.setAddress(request.getAddress().isBlank() ? null : request.getAddress().trim());
        }
        if (request.getGoogleMapsUrl() != null) {
            store.setGoogleMapsUrl(request.getGoogleMapsUrl().isBlank() ? null : request.getGoogleMapsUrl().trim());
        }
        if (request.getReservationWhatsappText() != null) {
            store.setReservationWhatsappText(request.getReservationWhatsappText().isBlank() ? null : request.getReservationWhatsappText().trim());
        }

        // ─── Bot-Schutz-Konfiguration ────────────────────────────────
        if (request.getBotProtectionEnabled() != null) {
            store.setBotProtectionEnabled(request.getBotProtectionEnabled());
        }
        if (request.getBotProtectionMode() != null && !request.getBotProtectionMode().isBlank()) {
            try {
                store.setBotProtectionMode(storebackend.enums.BotProtectionMode.valueOf(
                    request.getBotProtectionMode().trim().toUpperCase()
                ));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger botProtectionMode '{}' – ignoriert", request.getBotProtectionMode());
            }
        }

        // ─── Währung & Steuern ────────────────────────────────────────
        if (request.getCurrencyCode() != null && !request.getCurrencyCode().isBlank()) {
            try {
                store.setCurrencyCode(storebackend.enums.CurrencyCode.valueOf(request.getCurrencyCode().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger currencyCode '{}' – ignoriert", request.getCurrencyCode());
            }
        }
        if (request.getCountryCode() != null && !request.getCountryCode().isBlank()) {
            store.setCountryCode(request.getCountryCode().trim().toUpperCase());
        }
        if (request.getPriceMode() != null && !request.getPriceMode().isBlank()) {
            try {
                store.setPriceMode(storebackend.enums.PriceMode.valueOf(request.getPriceMode().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger priceMode '{}' – ignoriert", request.getPriceMode());
            }
        }
        if (request.getVatEnabled() != null) {
            store.setVatEnabled(request.getVatEnabled());
        }
        if (request.getDefaultTaxRate() != null) {
            store.setDefaultTaxRate(request.getDefaultTaxRate());
        }
        if (request.getShippingTaxRate() != null) {
            store.setShippingTaxRate(request.getShippingTaxRate());
        }
        if (request.getShippingTaxStrategy() != null && !request.getShippingTaxStrategy().isBlank()) {
            try {
                store.setShippingTaxStrategy(storebackend.enums.ShippingTaxStrategy.valueOf(request.getShippingTaxStrategy().trim().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                log.warn("Ungültiger shippingTaxStrategy '{}' – ignoriert", request.getShippingTaxStrategy());
            }
        }
        if (request.getVatExemptionText() != null) {
            store.setVatExemptionText(request.getVatExemptionText().isBlank() ? null : request.getVatExemptionText().trim());
        }

        // ─── Legal/Impressum-Felder ────────────────────────────────
        if (request.getLegalName() != null) {
            store.setLegalName(request.getLegalName().isBlank() ? null : request.getLegalName().trim());
        }
        if (request.getLegalForm() != null) {
            store.setLegalForm(request.getLegalForm().isBlank() ? null : request.getLegalForm().trim());
        }
        if (request.getAuthorizedRepresentative() != null) {
            store.setAuthorizedRepresentative(request.getAuthorizedRepresentative().isBlank() ? null : request.getAuthorizedRepresentative().trim());
        }
        if (request.getCommercialRegister() != null) {
            store.setCommercialRegister(request.getCommercialRegister().isBlank() ? null : request.getCommercialRegister().trim());
        }
        if (request.getRegisterNumber() != null) {
            store.setRegisterNumber(request.getRegisterNumber().isBlank() ? null : request.getRegisterNumber().trim());
        }
        if (request.getVatId() != null) {
            store.setVatId(request.getVatId().isBlank() ? null : request.getVatId().trim());
        }

        // ─── Legal Consent Tracking ─────────────────────────────────
        // Consent wird nur gesetzt wenn Legal-Felder bearbeitet wurden UND Consent-Zeitstempel mitgeliefert wurde
        if (request.getLegalResponsibilityAcceptedAt() != null) {
            store.setLegalResponsibilityAcceptedAt(request.getLegalResponsibilityAcceptedAt());
            store.setLegalResponsibilityAcceptedByUserId(user.getId());
            store.setLegalResponsibilityVersion(
                request.getLegalResponsibilityVersion() != null && !request.getLegalResponsibilityVersion().isBlank()
                    ? request.getLegalResponsibilityVersion().trim()
                    : "1.0"
            );
            log.info("✅ Legal Consent recorded for Store {}: User {}, Version {}, Timestamp {}",
                storeId, user.getEmail(), store.getLegalResponsibilityVersion(), store.getLegalResponsibilityAcceptedAt());
        }

        // ─── Automatische Impressum-Vollständigkeits-Prüfung ────────
        // Mindestanforderung: legalName, address, contactEmail
        boolean impressumComplete = store.getLegalName() != null && !store.getLegalName().isBlank()
            && store.getAddress() != null && !store.getAddress().isBlank()
            && store.getContactEmail() != null && !store.getContactEmail().isBlank();
        store.setImprintComplete(impressumComplete);

        store = storeRepository.save(store);
        log.info("Store {} updated by user {}", storeId, user.getEmail());

        return toDTO(store);
    }

    @Transactional
    public void deleteStore(Long storeId, User user) {
        Store store = storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to delete this store");
        }

        log.info("🗑️ Starting COMPLETE deletion of store {} ('{}') by user {}",
                 storeId, store.getName(), user.getEmail());

        try {
            // Hilfsmethode: JPQL-Bulk-Delete mit Logging
            // Quell-Reihenfolge: Blätter zuerst, Store zuletzt

            // === CHATBOT ===
            bulk("DELETE FROM ChatMessage cm WHERE cm.session.store.id = :sid", storeId, "ChatMessages");
            bulk("DELETE FROM ChatSession cs WHERE cs.store.id = :sid", storeId, "ChatSessions");
            bulk("DELETE FROM ChatbotIntent ci WHERE ci.store.id = :sid", storeId, "ChatbotIntents");
            bulk("DELETE FROM CannedResponse cr WHERE cr.store.id = :sid", storeId, "CannedResponses");

            // === FAQ ===
            bulk("DELETE FROM FaqItem fi WHERE fi.store.id = :sid", storeId, "FaqItems");
            bulk("DELETE FROM FaqCategory fc WHERE fc.store.id = :sid", storeId, "FaqCategories");

            // === REVIEWS & VOTES ===
            // ReviewVote → review.id (Subquery, da kein direkter store-Pfad)
            bulk("DELETE FROM ReviewVote rv WHERE rv.review.id IN " +
                 "(SELECT pr.id FROM ProductReview pr WHERE pr.product.store.id = :sid)",
                 storeId, "ReviewVotes");
            // ProductReview → product.store.id (kein direktes store-Feld!)
            bulk("DELETE FROM ProductReview pr WHERE pr.product.store.id = :sid", storeId, "ProductReviews");

            // === INVENTORY LOGS (vor ProductVariant!) ===
            bulk("DELETE FROM InventoryLog il WHERE il.variant.product.store.id = :sid", storeId, "InventoryLogs");

            // === PRODUCT MEDIA (vor Product!) ===
            bulk("DELETE FROM ProductMedia pm WHERE pm.product.store.id = :sid", storeId, "ProductMedia");

            // === PRODUCT OPTION VALUES (ElementCollection – native SQL, weil Hibernate 6
            //     bei JPQL-Bulk-Delete auf ElementCollection JOIN falsch generiert!) ===
            entityManager.createNativeQuery(
                "DELETE FROM product_option_values WHERE option_id IN " +
                "(SELECT id FROM product_options WHERE product_id IN " +
                " (SELECT id FROM products WHERE store_id = ?1))")
                .setParameter(1, storeId)
                .executeUpdate();
            log.info("✅ Deleted ProductOptionValues (native)");

            // === PRODUCT OPTIONS (native SQL – JPQL würde ElementCollection erneut fälschl. generieren!) ===
            entityManager.createNativeQuery(
                "DELETE FROM product_options WHERE product_id IN (SELECT id FROM products WHERE store_id = ?1)")
                .setParameter(1, storeId)
                .executeUpdate();
            log.info("✅ Deleted ProductOptions (native)");

            // === PRODUCT VARIANTS (vor Product!) ===
            bulk("DELETE FROM ProductVariant pv WHERE pv.product.store.id = :sid", storeId, "ProductVariants");

            // === SAVED CART ITEMS + SAVED CARTS (storeId = Long-Feld) ===
            bulk("DELETE FROM SavedCartItem sci WHERE sci.savedCart.storeId = :sid", storeId, "SavedCartItems");
            bulk("DELETE FROM SavedCart sc WHERE sc.storeId = :sid", storeId, "SavedCarts");

            // === PRODUCTS ===
            bulk("DELETE FROM Product p WHERE p.store.id = :sid", storeId, "Products");

            // === COMMISSIONS (vor Orders!) ===
            bulk("DELETE FROM Commission c WHERE c.order.store.id = :sid", storeId, "Commissions");

            // === ORDER STATUS HISTORY ===
            bulk("DELETE FROM OrderStatusHistory osh WHERE osh.order.store.id = :sid", storeId, "OrderStatusHistory");

            // === ORDER ITEMS ===
            bulk("DELETE FROM OrderItem oi WHERE oi.order.store.id = :sid", storeId, "OrderItems");

            // === ORDERS ===
            bulk("DELETE FROM Order o WHERE o.store.id = :sid", storeId, "Orders");

            // === PHONE VERIFICATIONS (storeId = Long-Spalte, keine ManyToOne) ===
            bulk("DELETE FROM PhoneVerification pv WHERE pv.storeId = :sid", storeId, "PhoneVerifications");

            // === WISHLIST ITEMS + WISHLISTS (Wishlist.storeId = Long-Feld, keine ManyToOne) ===
            bulk("DELETE FROM WishlistItem wi WHERE wi.wishlist.storeId = :sid", storeId, "WishlistItems");
            bulk("DELETE FROM Wishlist w WHERE w.storeId = :sid", storeId, "Wishlists");

            // === CART ITEMS + CARTS ===
            bulk("DELETE FROM CartItem ci WHERE ci.cart.store.id = :sid", storeId, "CartItems");
            bulk("DELETE FROM Cart c WHERE c.store.id = :sid", storeId, "Carts");

            // === COUPON REDEMPTIONS + COUPONS (beide: storeId = Long-Feld) ===
            bulk("DELETE FROM CouponRedemption cr WHERE cr.storeId = :sid", storeId, "CouponRedemptions");
            bulk("DELETE FROM Coupon c WHERE c.storeId = :sid", storeId, "Coupons");

            // === STORE PRODUCTS ===
            bulk("DELETE FROM StoreProduct sp WHERE sp.store.id = :sid", storeId, "StoreProducts");

            // === HOMEPAGE SECTIONS ===
            bulk("DELETE FROM HomepageSection hs WHERE hs.store.id = :sid", storeId, "HomepageSections");

            // === REDIRECT RULES (storeId = Long-Feld) ===
            bulk("DELETE FROM RedirectRule rr WHERE rr.storeId = :sid", storeId, "RedirectRules");

            // === SUPPLIER CONNECTIONS ===
            bulk("DELETE FROM SupplierConnection sc WHERE sc.store.id = :sid", storeId, "SupplierConnections");

            // === DELIVER ZONES + PROVIDERS + SETTINGS ===
            bulk("DELETE FROM DeliveryZone dz WHERE dz.store.id = :sid", storeId, "DeliveryZones");
            bulk("DELETE FROM DeliveryProvider dp WHERE dp.store.id = :sid", storeId, "DeliveryProviders");

            // === SEO (storeId = Long-Feld) ===
            bulk("DELETE FROM SeoSettings ss WHERE ss.storeId = :sid", storeId, "SeoSettings");
            bulk("DELETE FROM SeoAsset sa WHERE sa.storeId = :sid", storeId, "SeoAssets");
            bulk("DELETE FROM SitemapConfig sc WHERE sc.storeId = :sid", storeId, "SitemapConfigs");
            bulk("DELETE FROM StructuredDataTemplate sdt WHERE sdt.storeId = :sid", storeId, "StructuredDataTemplates");

            // === STORE SLIDER IMAGES + SETTINGS ===
            bulk("DELETE FROM StoreSliderImage ssi WHERE ssi.store.id = :sid", storeId, "StoreSliderImages");
            bulk("DELETE FROM StoreSliderSettings sss WHERE sss.store.id = :sid", storeId, "StoreSliderSettings");

            // === STORE THEME ===
            bulk("DELETE FROM StoreTheme st WHERE st.store.id = :sid", storeId, "StoreThemes");

            // === STORE USAGE ===
            bulk("DELETE FROM StoreUsage su WHERE su.store.id = :sid", storeId, "StoreUsage");

            // === STORE DELIVERY SETTINGS ===
            entityManager.createNativeQuery(
                "DELETE FROM store_delivery_settings WHERE store_id = ?1")
                .setParameter(1, storeId)
                .executeUpdate();
            log.info("✅ Deleted StoreDeliverySettings (native)");

            // === WIZARD PROGRESS ===
            entityManager.createNativeQuery(
                "UPDATE wizard_progress SET created_store_id = NULL WHERE created_store_id = ?1")
                .setParameter(1, storeId)
                .executeUpdate();

            // === MEDIA FILES (MinIO) ===
            log.info("Deleting media files from MinIO...");
            int deletedMediaCount = 0;
            try {
                deletedMediaCount = mediaService.deleteAllMediaForStore(store);
                log.info("✅ Deleted {} media files from MinIO", deletedMediaCount);
            } catch (Exception e) {
                log.error("⚠️ Error deleting media files (continuing): {}", e.getMessage());
            }

            // === DOMAINS ===
            bulk("DELETE FROM Domain d WHERE d.store.id = :sid", storeId, "Domains");

            // Alle abhängigen Entitäten wurden explizit per JPQL gelöscht.
            // Session sauber machen BEVOR der Store-Datensatz gelöscht wird.
            entityManager.flush();
            entityManager.clear();

            storeRepository.deleteById(storeId);

            log.info("🎉 Store {} COMPLETELY deleted ({} MinIO files) by user {}",
                     storeId, deletedMediaCount, user.getEmail());

        } catch (Exception e) {
            log.error("❌ Error during store deletion: {}", e.getMessage(), e);
            throw new RuntimeException("Fehler beim Löschen des Stores: " + e.getMessage(), e);
        }
    }

    /** Hilfsmethode: JPQL-Bulk-Delete mit Logging */
    private void bulk(String jpql, Long storeId, String label) {
        int count = entityManager.createQuery(jpql)
                .setParameter("sid", storeId)
                .executeUpdate();
        log.info("✅ Deleted {} {}", count, label);
    }

    public List<Store> getStoresByUserId(Long userId) {
        return storeRepository.findByOwnerId(userId);
    }

    public Store getStoreById(Long storeId) {
        return storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
    }

    public StoreDTO getStoreDTOById(Long storeId) {
        return toDTO(getStoreById(storeId));
    }

    /**
     * Befüllt einen bestehenden Store nachträglich mit dem zum businessType passenden
     * Starter-Pack (nur wenn noch keine Produkte vorhanden sind).
     * Nützlich, wenn der businessType erst nach der Erstellung auf RESTAURANT/RIAD
     * geändert wurde.
     */
    @Transactional
    public StoreDTO applyStarterPackToStore(Long storeId, User user) {
        Store store = storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to modify this store");
        }

        boolean cloned = starterPackService.applyForBusinessTypeIfEmpty(store);
        log.info("Starter-Pack für Store {} angewendet: {}", storeId, cloned);
        return toDTO(store);
    }

    private StoreDTO toDTO(Store store) {
        StoreDTO dto = new StoreDTO();
        dto.setId(store.getId());
        dto.setName(store.getName());
        dto.setSlug(store.getSlug());
        dto.setStatus(store.getStatus());
        dto.setDescription(store.getDescription());
        dto.setCreatedAt(store.getCreatedAt());
        dto.setWhatsappNumber(store.getWhatsappNumber());
        dto.setWhatsappNotificationsEnabled(store.isWhatsappNotificationsEnabled());
        dto.setGreetingMessage(store.getGreetingMessage());
        // ─── Social Media & Kontakt-Links ─────────────────────────────
        dto.setContactEmail(store.getContactEmail());
        dto.setContactPhone(store.getContactPhone());
        dto.setLogoUrl(store.getLogoUrl());
        dto.setBannerImageUrl(store.getBannerImageUrl());
        dto.setTelegramUrl(store.getTelegramUrl());
        dto.setFacebookUrl(store.getFacebookUrl());
        dto.setInstagramUrl(store.getInstagramUrl());
        dto.setTiktokUrl(store.getTiktokUrl());
        dto.setFooterText(store.getFooterText());
        // ─── Business-Typ & Restaurant/Riad-Felder ─────────────────────
        dto.setBusinessType(store.getBusinessType());
        dto.setOpeningHours(store.getOpeningHours());
        dto.setAddress(store.getAddress());
        dto.setGoogleMapsUrl(store.getGoogleMapsUrl());
        dto.setReservationWhatsappText(store.getReservationWhatsappText());
        // ─── Bot-Schutz (nur für Admin-Bereich) ─────────────────────────
        dto.setBotProtectionEnabled(store.isBotProtectionEnabled());
        dto.setBotProtectionMode(store.getBotProtectionMode());
        // ─── Währung & Steuern ─────────────────────────────────────────
        dto.setCurrencyCode(store.getCurrencyCode());
        dto.setCountryCode(store.getCountryCode());
        dto.setPriceMode(store.getPriceMode());
        dto.setVatEnabled(store.getVatEnabled());
        dto.setDefaultTaxRate(store.getDefaultTaxRate());
        dto.setShippingTaxRate(store.getShippingTaxRate());
        dto.setShippingTaxStrategy(store.getShippingTaxStrategy());
        dto.setVatExemptionText(store.getVatExemptionText());
        // ─── Legal/Impressum (nur für Admin) ───────────────────────────
        dto.setLegalName(store.getLegalName());
        dto.setLegalForm(store.getLegalForm());
        dto.setAuthorizedRepresentative(store.getAuthorizedRepresentative());
        dto.setCommercialRegister(store.getCommercialRegister());
        dto.setRegisterNumber(store.getRegisterNumber());
        dto.setVatId(store.getVatId());
        dto.setLegalResponsibilityAcceptedAt(store.getLegalResponsibilityAcceptedAt());
        dto.setLegalResponsibilityAcceptedByUserId(store.getLegalResponsibilityAcceptedByUserId());
        dto.setLegalResponsibilityVersion(store.getLegalResponsibilityVersion());
        dto.setImprintComplete(store.getImprintComplete());
        return dto;
    }

    /**
     * Bestimmt die Store-Kategorie basierend auf Name und Beschreibung
     * für passende Default-Slider-Bilder
     */
    private String determineStoreCategory(String name, String description) {
        if (name == null && description == null) {
            return "general";
        }

        String combined = (name + " " + (description != null ? description : "")).toLowerCase();

        // Fashion/Clothing Keywords
        if (combined.matches(".*(fashion|clothing|apparel|style|boutique|wear|clothes|dress).*")) {
            return "fashion";
        }

        // Electronics Keywords
        if (combined.matches(".*(electronic|gadget|tech|computer|phone|laptop|device).*")) {
            return "electronics";
        }

        // Food Keywords
        if (combined.matches(".*(food|restaurant|cafe|bakery|kitchen|cuisine|meal|cook).*")) {
            return "food";
        }

        // Default fallback
        return "general";
    }
    
    /**
     * Update Store Shipping Address (DHL Absender-Adresse)
     */
    @Transactional
    public StoreDTO updateShippingAddress(Long storeId, storebackend.dto.StoreShippingAddressUpdateDTO dto, User user) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));
        
        // Security: Only owner can update
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new IllegalStateException("You are not the owner of this store");
        }
        
        // Validation
        if (dto.getStreet() == null || dto.getStreet().isBlank()) {
            throw new IllegalArgumentException("Street is required");
        }
        if (dto.getHouseNumber() == null || dto.getHouseNumber().isBlank()) {
            throw new IllegalArgumentException("House number is required");
        }
        if (dto.getPostalCode() == null || dto.getPostalCode().isBlank()) {
            throw new IllegalArgumentException("Postal code is required");
        }
        if (dto.getCity() == null || dto.getCity().isBlank()) {
            throw new IllegalArgumentException("City is required");
        }
        if (dto.getCountry() == null || dto.getCountry().isBlank()) {
            throw new IllegalArgumentException("Country is required");
        }
        
        // Country validation (ISO 3166-1 alpha-2)
        String country = dto.getCountry().toUpperCase();
        if (!country.matches("^[A-Z]{2}$")) {
            throw new IllegalArgumentException("Country must be ISO 3166-1 alpha-2 code (e.g. DE, AT, CH)");
        }
        
        // Update
        store.setShippingAddressStreet(dto.getStreet().trim());
        store.setShippingAddressHouseNumber(dto.getHouseNumber().trim());
        store.setShippingAddressPostalCode(dto.getPostalCode().trim());
        store.setShippingAddressCity(dto.getCity().trim());
        store.setShippingAddressCountry(country);
        store.setShippingAddressEmail(dto.getEmail() != null && !dto.getEmail().isBlank() 
            ? dto.getEmail().trim() 
            : null);
        
        Store saved = storeRepository.save(store);
        
        log.info("✅ Shipping address updated for store {} ({})", storeId, store.getName());
        
        return toDTO(saved);
    }
}

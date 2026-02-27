package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.config.SaasProperties;
import storebackend.dto.CreateStoreRequest;
import storebackend.dto.UpdateStoreRequest;
import storebackend.dto.StoreDTO;
import storebackend.entity.Domain;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.Role;
import storebackend.enums.StoreStatus;
import storebackend.repository.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreService {

    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final DomainRepository domainRepository;
    private final MediaService mediaService;
    private final SaasProperties saasProperties;
    private final StorePostCreateService postCreateService;

    // Repositories für Cascade-Deletion
    private final CommissionRepository commissionRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductReviewRepository productReviewRepository;

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

        // Check max stores limit
        long currentStoreCount = storeRepository.countByOwner(owner);
        if (owner.getPlan() != null && currentStoreCount >= owner.getPlan().getMaxStores()) {
            throw new RuntimeException("Maximum stores limit reached for your plan");
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

        store = storeRepository.save(store);
        log.info("Store {} updated by user {}", storeId, user.getEmail());

        return toDTO(store);
    }

    @Transactional
    public void deleteStore(Long storeId, User user) {
        Store store = storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));

        // Verify ownership (Store Manager kann seinen eigenen Store löschen)
        if (!store.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to delete this store");
        }

        log.info("🗑️ Starting COMPLETE deletion of store {} ('{}') by user {}",
                 storeId, store.getName(), user.getEmail());

        try {
            // === PHASE 1: Commissions (ZUERST!) ===
            // Diese haben FK zu Orders, müssen also vor Orders gelöscht werden
            log.info("Phase 1: Deleting commissions...");
            var orders = orderRepository.findByStoreIdOrderByCreatedAtDesc(storeId);
            int commissionCount = 0;
            for (var order : orders) {
                var commissions = commissionRepository.findByOrderId(order.getId());
                commissionCount += commissions.size();
                commissionRepository.deleteAll(commissions);
            }
            log.info("✅ Deleted {} commissions", commissionCount);

            // === PHASE 2: Order Dependencies ===
            log.info("Phase 2: Deleting order dependencies...");
            int orderItemCount = 0;
            int statusHistoryCount = 0;
            for (var order : orders) {
                // Order Items
                var orderItems = orderItemRepository.findByOrderId(order.getId());
                orderItemCount += orderItems.size();
                orderItemRepository.deleteAll(orderItems);

                // Order Status History
                var statusHistory = orderStatusHistoryRepository.findByOrderIdOrderByTimestampDesc(order.getId());
                statusHistoryCount += statusHistory.size();
                orderStatusHistoryRepository.deleteAll(statusHistory);
            }
            log.info("✅ Deleted {} order items, {} status histories", orderItemCount, statusHistoryCount);

            // === PHASE 3: Orders ===
            log.info("Phase 3: Deleting orders...");
            int orderCount = orders.size();
            orderRepository.deleteAll(orders);
            log.info("✅ Deleted {} orders", orderCount);

            // === PHASE 4: Product Reviews ===
            log.info("Phase 4: Deleting product reviews...");
            int reviewCount = productReviewRepository.findAll().stream()
                .filter(r -> r.getProduct().getStore().getId().equals(storeId))
                .mapToInt(r -> {
                    productReviewRepository.delete(r);
                    return 1;
                })
                .sum();
            log.info("✅ Deleted {} product reviews", reviewCount);

            // === PHASE 5: Cart Items ===
            log.info("Phase 5: Deleting cart items...");
            var carts = cartRepository.findAll().stream()
                .filter(c -> c.getStore() != null && c.getStore().getId().equals(storeId))
                .toList();
            int cartItemCount = 0;
            for (var cart : carts) {
                var cartItems = cartItemRepository.findByCartId(cart.getId());
                cartItemCount += cartItems.size();
                cartItemRepository.deleteAll(cartItems);
            }
            log.info("✅ Deleted {} cart items from {} carts", cartItemCount, carts.size());

            // === PHASE 6: Carts ===
            log.info("Phase 6: Deleting carts...");
            cartRepository.deleteAll(carts);
            log.info("✅ Deleted {} carts", carts.size());

            // === PHASE 7: Media Files (MinIO) ===
            log.info("Phase 7: Deleting media files from MinIO...");
            int deletedMediaCount = 0;
            try {
                deletedMediaCount = mediaService.deleteAllMediaForStore(store);
                log.info("✅ Deleted {} media files from MinIO", deletedMediaCount);
            } catch (Exception e) {
                log.error("⚠️ Error deleting media files (continuing): {}", e.getMessage());
            }

            // === PHASE 8: Domains ===
            log.info("Phase 8: Deleting domains...");
            List<Domain> domains = domainRepository.findByStore(store);
            int domainCount = domains.size();
            if (!domains.isEmpty()) {
                domainRepository.deleteAll(domains);
                log.info("✅ Deleted {} domains", domainCount);
            }

            // === PHASE 9: Store (mit CASCADE für Products, Categories, etc.) ===
            log.info("Phase 9: Deleting store entity (CASCADE: products, categories, themes, etc.)...");
            storeRepository.delete(store);

            log.info("🎉 Store {} COMPLETELY deleted: {} orders, {} commissions, {} domains, {} media files, by user {}",
                     storeId, orderCount, commissionCount, domainCount, deletedMediaCount, user.getEmail());

        } catch (Exception e) {
            log.error("❌ Error during store deletion: {}", e.getMessage(), e);
            throw new RuntimeException("Fehler beim Löschen des Stores: " + e.getMessage(), e);
        }
    }

    public List<Store> getStoresByUserId(Long userId) {
        return storeRepository.findByOwnerId(userId);
    }

    public Store getStoreById(Long storeId) {
        return storeRepository.findByIdWithOwner(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found"));
    }

    private StoreDTO toDTO(Store store) {
        StoreDTO dto = new StoreDTO();
        dto.setId(store.getId());
        dto.setName(store.getName());
        dto.setSlug(store.getSlug());
        dto.setStatus(store.getStatus());
        dto.setDescription(store.getDescription());
        dto.setCreatedAt(store.getCreatedAt());
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
}

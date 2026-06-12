package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import storebackend.entity.Plan;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.BusinessType;
import storebackend.enums.Role;
import storebackend.enums.StoreStatus;
import storebackend.repository.PlanRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;
import storebackend.security.JwtUtil;
import storebackend.service.StarterPackService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Öffentlicher Store-Erstellungs-Endpoint – KEIN Login erforderlich.
 *
 * Flow:
 *   POST /api/public/create-store
 *   → Erstellt anonymen User + Store
 *   → Gibt JWT zurück (User ist sofort eingeloggt)
 *   → User kann später optional E-Mail/Telefon hinzufügen
 */
@RestController
@RequestMapping("/api/public/create-store")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class PublicStoreCreationController {

    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PlanRepository planRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final StarterPackService starterPackService;

    public record CreateStorePublicRequest(
        @NotBlank(message = "Store-Name darf nicht leer sein")
        @Size(min = 2, max = 80, message = "Store-Name muss 2–80 Zeichen haben")
        String storeName,

        String storeSlug,   // optional – wird automatisch generiert
        String category,    // optional
        String businessType,     // optional: SHOP | RESTAURANT | RIAD
        Boolean seedSampleData   // optional: mit Starter-Pack vorbefüllen
    ) {}

    public record CreateStorePublicResponse(
        String token,
        long storeId,
        String storeSlug,
        long userId,
        boolean isAnonymous,
        String message
    ) {}

    /**
     * POST /api/public/create-store
     * Kein Auth-Header erforderlich.
     */
    @PostMapping
    public ResponseEntity<?> createStore(@Valid @RequestBody CreateStorePublicRequest req) {
        log.info("🏪 [PublicCreate] Anonyme Store-Erstellung: '{}'", req.storeName());

        try {
            // ── 1. Anonymen User erstellen ─────────────────────────────────
            String uid = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            String email = "anon-" + uid + "@markt.ma";

            User user = new User();
            user.setEmail(email);
            user.setName(req.storeName()); // Store-Name als Display-Name
            user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            user.setEmailVerified(false);
            user.setPreferredLanguage("de");

            Set<Role> roles = new HashSet<>();
            roles.add(Role.USER);
            user.setRoles(roles);

            Plan freePlan = planRepository.findByName("FREE")
                .orElseThrow(() -> new RuntimeException("FREE plan not found"));
            user.setPlan(freePlan);

            user = userRepository.save(user);
            log.info("👤 [PublicCreate] Anonymer User erstellt: ID={}", user.getId());

            // ── 2. Slug generieren / validieren ───────────────────────────
            String slug = buildUniqueSlug(req.storeSlug(), req.storeName());

            // ── 3. Store erstellen ────────────────────────────────────────
            Store store = new Store();
            store.setOwner(user);
            store.setName(req.storeName().trim());
            store.setSlug(slug);
            store.setStatus(StoreStatus.ACTIVE);
            if (req.category() != null && !req.category().isBlank()) {
                store.setDescription("Kategorie: " + req.category());
            }
            // Business-Typ (Default SHOP)
            if (req.businessType() != null && !req.businessType().isBlank()) {
                try {
                    store.setBusinessType(BusinessType.valueOf(req.businessType().trim().toUpperCase()));
                } catch (IllegalArgumentException ex) {
                    log.warn("[PublicCreate] Ungültiger businessType '{}' – Default SHOP", req.businessType());
                }
            }
            store = storeRepository.save(store);
            log.info("✅ [PublicCreate] Store erstellt: ID={}, Slug={}, businessType={}",
                store.getId(), slug, store.getBusinessType());

            // Optional: Starter-Pack-Content für RESTAURANT/RIAD vorbefüllen
            if (Boolean.TRUE.equals(req.seedSampleData())) {
                try {
                    starterPackService.cloneForBusinessType(store, store.getBusinessType());
                } catch (Exception e) {
                    log.warn("[PublicCreate] Starter-Pack-Klonen fehlgeschlagen: {}", e.getMessage());
                }
            }

            // ── 4. JWT generieren ─────────────────────────────────────────────
            String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());


            return ResponseEntity.ok(new CreateStorePublicResponse(
                token,
                store.getId(),
                slug,
                user.getId(),
                true,
                "Store erfolgreich erstellt! Du kannst jetzt loslegen."
            ));

        } catch (Exception e) {
            log.error("❌ [PublicCreate] Fehler: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Fehler beim Erstellen des Stores: " + e.getMessage()));
        }
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private String buildUniqueSlug(String requestedSlug, String storeName) {
        String base;
        if (requestedSlug != null && !requestedSlug.isBlank()) {
            base = requestedSlug.toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
        } else {
            base = storeName.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("[\\s-]+", "-")
                .substring(0, Math.min(30, storeName.length()));
            if (base.isBlank()) base = "store";
        }

        String slug = base;
        int attempt = 0;
        while (storeRepository.existsBySlug(slug)) {
            attempt++;
            slug = base + "-" + attempt;
        }
        return slug;
    }
}


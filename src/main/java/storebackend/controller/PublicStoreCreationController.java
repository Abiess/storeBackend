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
import storebackend.service.EmailService;
import storebackend.service.StarterPackService;
import storebackend.service.StorePostCreateService;
import storebackend.config.SaasProperties;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
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
    private final StorePostCreateService storePostCreateService;
    private final SaasProperties saasProperties;
    private final EmailService emailService;

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
        String storeUrl,
        long userId,
        String userEmail,
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

            // ── 4. Subdomain + Slider + Homepage initialisieren ───────────────
            storePostCreateService.executePostCreateOperations(store.getId(), req.category());

            // ── 5. JWT generieren ─────────────────────────────────────────────
            String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRoles());
            String storeUrl = "https://" + saasProperties.generateSubdomain(slug);

            return ResponseEntity.ok(new CreateStorePublicResponse(
                token,
                store.getId(),
                slug,
                storeUrl,
                user.getId(),
                user.getEmail(),
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

    /**
     * POST /api/public/create-store/save-email
     * Nachdem ein anonymer User seinen Store erstellt hat, kann er hier seine
     * echte E-Mail hinterlegen. Das System aktualisiert die Fake-Adresse,
     * schickt eine Store-Zugangs-Mail und stellt einen neuen JWT aus.
     */
    @PostMapping("/save-email")
    public ResponseEntity<?> saveEmail(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody SaveEmailRequest req) {
        try {
            String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
            Long userId = jwtUtil.extractUserId(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Ungültiger Token"));
            }

            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User nicht gefunden"));

            // Nur anonyme User dürfen ihre E-Mail setzen
            if (!user.getEmail().startsWith("anon-")) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "User hat bereits eine echte E-Mail"));
            }

            // E-Mail-Kollision prüfen
            if (userRepository.existsByEmail(req.email())) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "EMAIL_ALREADY_EXISTS"));
            }

            user.setEmail(req.email());
            userRepository.save(user);
            log.info("✅ [SaveEmail] E-Mail für User {} gesetzt: {}", userId, req.email());

            // Store-URL und Dashboard-URL ermitteln
            Store store = storeRepository.findById(req.storeId())
                .orElseThrow(() -> new RuntimeException("Store nicht gefunden"));
            String storeUrl = "https://" + saasProperties.generateSubdomain(store.getSlug());
            String dashboardUrl = "https://markt.ma/stores/" + store.getId();

            // Store-Zugangs-Mail schicken
            emailService.sendStoreAccessEmail(req.email(), store.getName(), storeUrl, dashboardUrl, "de");

            // Neuen JWT mit der echten E-Mail ausstellen
            String newToken = jwtUtil.generateToken(req.email(), userId, user.getRoles());

            return ResponseEntity.ok(Map.of(
                "token", newToken,
                "message", "E-Mail gespeichert! Wir haben dir deinen Store-Link zugeschickt."
            ));

        } catch (Exception e) {
            log.error("❌ [SaveEmail] Fehler: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Fehler beim Speichern der E-Mail: " + e.getMessage()));
        }
    }

    public record SaveEmailRequest(
        @NotBlank @Email(message = "Ungültige E-Mail-Adresse")
        String email,
        long storeId
    ) {}

    private String buildUniqueSlug(String requestedSlug, String storeName) {
        String slug;
        if (requestedSlug != null && !requestedSlug.isBlank()) {
            slug = requestedSlug.toLowerCase().replaceAll("[^a-z0-9-]", "-").replaceAll("-+", "-");
        } else {
            slug = storeName.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("[\\s-]+", "-")
                .substring(0, Math.min(30, storeName.length()));
            if (slug.isBlank()) slug = "store";
        }

        // Prüfen ob Slug bereits existiert
        if (storeRepository.existsBySlug(slug)) {
            throw new RuntimeException("Slug '" + slug + "' already exists. Please choose a different name.");
        }
        
        return slug;
    }
}


package storebackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.DeliveryPartnerDTO;
import storebackend.dto.DeliveryPartnerRequest;
import storebackend.dto.DeliveryPartnerReviewDTO;
import storebackend.entity.User;
import storebackend.service.DeliveryPartnerMarketplaceService;

import java.util.List;
import java.util.Map;

/**
 * Controller für den Delivery-Partner-Marktplatz.
 * Plattformweit (nicht Store-gebunden).
 *
 * Endpoints:
 *   GET    /api/delivery-partners           – Alle aktiven Partner (mit optionalem Filter)
 *   GET    /api/delivery-partners/featured   – Top-Partner
 *   GET    /api/delivery-partners/{id}       – Einzelnes Profil
 *   GET    /api/delivery-partners/me         – Eigenes Profil
 *   POST   /api/delivery-partners/me         – Profil anlegen
 *   PUT    /api/delivery-partners/me         – Profil aktualisieren
 *   PATCH  /api/delivery-partners/me/status  – Profil (de-)aktivieren
 *   GET    /api/delivery-partners/{id}/reviews – Bewertungen eines Partners
 *   POST   /api/delivery-partners/{id}/reviews – Bewertung abgeben
 */
@RestController
@RequestMapping("/api/delivery-partners")
@Tag(name = "Delivery Partner Marketplace", description = "Plattformweiter Marktplatz für Lieferpartner")
@RequiredArgsConstructor
@Slf4j
public class DeliveryPartnerController {

    private final DeliveryPartnerMarketplaceService service;

    // ═══════════════════════════════════════════════
    //  MARKETPLACE (öffentlich / alle User)
    // ═══════════════════════════════════════════════

    @GetMapping
    @Operation(summary = "Alle Partner suchen", description = "Suche aktive Delivery-Partner mit optionalen Filtern")
    public ResponseEntity<List<DeliveryPartnerDTO>> searchPartners(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean verified,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String service,
            @RequestParam(name = "international", required = false) Boolean international,
            @RequestParam(required = false) Double minRating) {

        List<DeliveryPartnerDTO> partners = this.service.searchPartners(type, verified, search, region, service, international);

        // Client-side minRating-Filter (optional)
        if (minRating != null) {
            partners = partners.stream()
                .filter(p -> p.getAverageRating() != null && p.getAverageRating().doubleValue() >= minRating)
                .toList();
        }

        return ResponseEntity.ok(partners);
    }

    @GetMapping("/featured")
    @Operation(summary = "Top-Partner", description = "Zeige featured/empfohlene Partner")
    public ResponseEntity<List<DeliveryPartnerDTO>> getFeaturedPartners() {
        return ResponseEntity.ok(service.getFeaturedPartners());
    }

    @GetMapping("/{partnerId}")
    @Operation(summary = "Partner-Profil", description = "Einzelnes Partner-Profil laden")
    public ResponseEntity<?> getPartner(@PathVariable Long partnerId) {
        try {
            return ResponseEntity.ok(service.getPartner(partnerId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        }
    }

    // ═══════════════════════════════════════════════
    //  EIGENES PROFIL (Auth erforderlich)
    // ═══════════════════════════════════════════════

    @GetMapping("/me")
    @Operation(summary = "Mein Profil", description = "Eigenes Delivery-Partner-Profil laden")
    public ResponseEntity<?> getMyProfile(@AuthenticationPrincipal User user) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(service.getMyProfile(user));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", "Kein Profil vorhanden"));
        }
    }

    @PostMapping("/me")
    @Operation(summary = "Profil anlegen", description = "Neues Delivery-Partner-Profil erstellen")
    public ResponseEntity<?> createProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DeliveryPartnerRequest request) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(service.createProfile(user, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/me")
    @Operation(summary = "Profil aktualisieren", description = "Bestehendes Profil aktualisieren")
    public ResponseEntity<?> updateProfile(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DeliveryPartnerRequest request) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(service.updateProfile(user, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/me/status")
    @Operation(summary = "Profil (de-)aktivieren", description = "Profil aktiv/pausiert schalten")
    public ResponseEntity<?> toggleActive(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Boolean> body) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Boolean active = body.get("active");
        if (active == null) return ResponseEntity.badRequest().body(Map.of("message", "'active' field required"));
        try {
            return ResponseEntity.ok(service.toggleActive(user, active));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ═══════════════════════════════════════════════
    //  BEWERTUNGEN
    // ═══════════════════════════════════════════════

    @GetMapping("/{partnerId}/reviews")
    @Operation(summary = "Partner-Bewertungen", description = "Alle Bewertungen eines Partners laden")
    public ResponseEntity<List<DeliveryPartnerReviewDTO>> getPartnerReviews(@PathVariable Long partnerId) {
        return ResponseEntity.ok(service.getPartnerReviews(partnerId));
    }

    @PostMapping("/{partnerId}/reviews")
    @Operation(summary = "Bewertung abgeben", description = "Einen Partner bewerten (als Store-Besitzer)")
    public ResponseEntity<?> createReview(
            @PathVariable Long partnerId,
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DeliveryPartnerReviewDTO reviewDTO) {
        if (user == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        try {
            return ResponseEntity.ok(service.createReview(partnerId, user, reviewDTO));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}


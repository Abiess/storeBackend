package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.config.SaasProperties;
import storebackend.dto.PublicStoreDTO;
import storebackend.entity.Domain;
import storebackend.service.DomainService;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
@Slf4j
public class PublicStoreController {

    private final DomainService domainService;
    private final SaasProperties saasProperties;

    @GetMapping("/store/resolve")
    public ResponseEntity<PublicStoreDTO> resolveStore(
            @RequestParam(required = false) String host,
            HttpServletRequest request) {

        // Host aus Parameter oder Header extrahieren
        String targetHost = host != null ? host : request.getHeader("Host");

        if (targetHost == null) {
            log.warn("No host provided for store resolution");
            return ResponseEntity.badRequest().build();
        }

        // Port entfernen falls vorhanden (z.B. localhost:8080)
        if (targetHost.contains(":")) {
            targetHost = targetHost.substring(0, targetHost.indexOf(":"));
        }

        log.info("Resolving store for host: {}", targetHost);

        // ✅ FIX: Verwende die neue Service-Methode die direkt DTO zurückgibt
        // Diese Methode lädt Store mit JOIN FETCH innerhalb der Transaktion
        Optional<PublicStoreDTO> storeDTO = domainService.resolveStoreByHost(targetHost);

        if (storeDTO.isEmpty()) {
            log.info("No active verified domain found for host: {}", targetHost);
            return ResponseEntity.notFound().build();
        }

        log.info("Successfully resolved store {} for host {}", storeDTO.get().getName(), targetHost);

        return ResponseEntity.ok(storeDTO.get());
    }

    @GetMapping("/store/by-slug/{slug}")
    public ResponseEntity<PublicStoreDTO> resolveStoreBySlug(@PathVariable String slug) {

        log.info("Resolving store by slug: {}", slug);

        // Generiere Subdomain und suche
        String subdomain = saasProperties.generateSubdomain(slug);

        // ✅ FIX: Verwende die neue DTO-basierte Methode
        Optional<PublicStoreDTO> storeDTO = domainService.resolveStoreByHost(subdomain);

        if (storeDTO.isEmpty()) {
            log.info("No active verified subdomain found for slug: {}", slug);
            return ResponseEntity.notFound().build();
        }

        log.info("Successfully resolved store {} by slug {}", storeDTO.get().getName(), slug);

        return ResponseEntity.ok(storeDTO.get());
    }

    @GetMapping("/domain/check-availability")
    public ResponseEntity<Boolean> checkDomainAvailability(@RequestParam String host) {

        if (host == null || host.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        host = host.trim().toLowerCase();

        // Prüfe ob es eine Subdomain unserer Platform ist
        if (saasProperties.isSubdomainOfBaseDomain(host)) {
            String slug = saasProperties.extractSlugFromSubdomain(host);
            if (slug == null || slug.isEmpty()) {
                return ResponseEntity.ok(false);
            }
            // Prüfe ob slug verfügbar ist (kein Store mit diesem slug existiert)
            // Das würde über StoreRepository geprüft werden
            return ResponseEntity.ok(true); // Für jetzt verfügbar
        }

        // Prüfe ob Custom Domain bereits existiert
        Optional<Domain> existingDomain = domainService.resolveDomainByHost(host);
        boolean available = existingDomain.isEmpty();

        return ResponseEntity.ok(available);
    }
}

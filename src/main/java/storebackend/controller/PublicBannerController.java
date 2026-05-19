package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.dto.StoreBannerSettingsDTO;
import storebackend.service.StoreBannerService;

/**
 * Öffentlicher Endpunkt – kein Auth erforderlich.
 * GET /api/public/stores/{storeId}/banner
 *
 * Rückwärtskompatibel: Gibt für ALLE Stores einen Response zurück –
 * auch wenn noch keine Banner-Einstellungen vorhanden sind (enabled=false).
 * Fehlerfall → leeres 204 No Content statt 500.
 */
@RestController
@RequestMapping("/api/public/stores/{storeId}/banner")
@RequiredArgsConstructor
@Slf4j
public class PublicBannerController {

    private final StoreBannerService bannerService;

    @GetMapping
    public ResponseEntity<StoreBannerSettingsDTO> getBanner(@PathVariable Long storeId) {
        try {
            // Optional.empty() → 204 No Content = "nicht konfiguriert" → Frontend nutzt Client-Default
            // Optional.of(dto) → 200 OK mit enabled-Flag → Frontend respektiert enabled=false
            return bannerService.getBanner(storeId)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.noContent().build());
        } catch (Exception e) {
            log.warn("[PublicBanner] Fehler beim Laden des Banners für Store {}: {}", storeId, e.getMessage());
            return ResponseEntity.noContent().build();
        }
    }
}


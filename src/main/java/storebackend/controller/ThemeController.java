package storebackend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Öffentlicher Controller für Theme-Abfragen
 * Erlaubt unauthentifizierten Zugriff auf Store-Themes
 */
@RestController
@RequestMapping("/api/themes")
@RequiredArgsConstructor
@Slf4j
public class ThemeController {

    @GetMapping("/store/{storeId}/active")
    public ResponseEntity<?> getActiveTheme(@PathVariable Long storeId) {
        log.info("Public request for active theme of store: {}", storeId);

        // Aktuell kein Theme-System implementiert
        // Gebe leeres Objekt zurück, damit Frontend nicht abstürzt
        return ResponseEntity.ok().body(null);
    }
}


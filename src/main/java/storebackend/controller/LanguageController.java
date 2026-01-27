package storebackend.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import storebackend.config.LanguageConfig;
import storebackend.dto.LanguageConfigDTO;

import java.util.ArrayList;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class LanguageController {

    @GetMapping
    public ResponseEntity<LanguageConfigDTO> getLanguageConfig(HttpServletRequest request) {
        // Sprache wurde bereits vom Filter erkannt
        String resolvedLanguage = (String) request.getAttribute("resolvedLanguage");

        if (resolvedLanguage == null) {
            resolvedLanguage = LanguageConfig.DEFAULT_LANGUAGE;
        }

        LanguageConfigDTO config = new LanguageConfigDTO(
            resolvedLanguage,
            new ArrayList<>(LanguageConfig.SUPPORTED_LANGUAGES),
            LanguageConfig.getDirection(resolvedLanguage)
        );

        return ResponseEntity.ok(config);
    }

    @PostMapping("/language")
    public ResponseEntity<LanguageConfigDTO> setLanguage(
            @RequestParam String lang,
            HttpServletResponse response) {

        // Validierung
        if (!LanguageConfig.isSupported(lang)) {
            lang = LanguageConfig.DEFAULT_LANGUAGE;
        }

        // Cookie setzen
        Cookie cookie = new Cookie(LanguageConfig.COOKIE_NAME, lang);
        cookie.setPath("/");
        cookie.setMaxAge(LanguageConfig.COOKIE_MAX_AGE);
        cookie.setHttpOnly(false); // Muss von JavaScript lesbar sein
        cookie.setSecure(false); // Für Production auf true setzen
        response.addCookie(cookie);

        LanguageConfigDTO config = new LanguageConfigDTO(
            lang,
            new ArrayList<>(LanguageConfig.SUPPORTED_LANGUAGES),
            LanguageConfig.getDirection(lang)
        );

        return ResponseEntity.ok(config);
    }
}

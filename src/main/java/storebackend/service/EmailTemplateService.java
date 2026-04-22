package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.mustachejava.DefaultMustacheFactory;
import com.github.mustachejava.Mustache;
import com.github.mustachejava.MustacheFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStreamReader;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rendert HTML-E-Mail-Templates mit Mustache.
 * Texte werden aus den gemeinsamen i18n JSON-Dateien geladen (de/en/ar).
 * Gleiche JSON-Struktur wie das Angular-Frontend unter storeFrontend/src/assets/i18n/
 */
@Service
@Slf4j
public class EmailTemplateService {

    private final ObjectMapper objectMapper;
    private final MustacheFactory mustacheFactory;

    // Cache für geladene Übersetzungen
    private final ConcurrentHashMap<String, JsonNode> translationCache = new ConcurrentHashMap<>();

    private static final String SUPPORTED_LANGS_REGEX = "de|en|ar";

    public EmailTemplateService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.mustacheFactory = new DefaultMustacheFactory("email-templates/");
    }

    /**
     * Rendert ein HTML-E-Mail-Template.
     *
     * @param templateName  Dateiname ohne Pfad, z.B. "order-confirmation.html"
     * @param lang          Sprache: "de", "en" oder "ar"
     * @param variables     Template-Variablen (überschreiben/ergänzen die i18n-Texte)
     * @return fertiges HTML als String
     */
    public String render(String templateName, String lang, Map<String, Object> variables) {
        String resolvedLang = resolveLanguage(lang);
        JsonNode translations = loadTranslations(resolvedLang);

        // Basis-Variablen aus i18n JSON laden
        Map<String, Object> ctx = new HashMap<>();
        ctx.put("lang", resolvedLang);
        ctx.put("dir", "ar".equals(resolvedLang) ? "rtl" : "ltr");

        // Alle email.* Keys flach in den Kontext einfügen
        JsonNode emailNode = translations.get("email");
        if (emailNode != null) {
            flattenNode("", emailNode, ctx);
        }

        // Übergebene Variablen überschreiben i18n-Werte (höhere Priorität)
        ctx.putAll(variables);

        try {
            Mustache mustache = mustacheFactory.compile(templateName);
            StringWriter writer = new StringWriter();
            mustache.execute(writer, ctx).flush();
            return writer.toString();
        } catch (Exception e) {
            log.error("Failed to render email template '{}': {}", templateName, e.getMessage(), e);
            // Fallback: einfaches Text-HTML
            return buildFallbackHtml(ctx);
        }
    }

    /**
     * Gibt einen einzelnen i18n-Wert zurück.
     * Key ist relativ zum "email"-Block der JSON: z.B. "verification.title"
     */
    public String getI18nValue(String lang, String key, String fallback) {
        String resolvedLang = resolveLanguage(lang);
        JsonNode translations = loadTranslations(resolvedLang);
        JsonNode emailNode = translations.get("email");
        if (emailNode == null) return fallback;

        // Dot-Notation traversieren: "verification.title" → email → verification → title
        String[] parts = key.split("\\.");
        JsonNode current = emailNode;
        for (String part : parts) {
            current = current.get(part);
            if (current == null) return fallback;
        }
        return current.isTextual() ? current.asText() : fallback;
    }

    /**
     * Hilfsmethode: Rendert und gibt Betreff-String zurück (mit {{}} Ersetzung)
     */
    public String renderSubject(String subjectTemplate, Map<String, Object> variables) {
        String result = subjectTemplate;
        for (Map.Entry<String, Object> entry : variables.entrySet()) {
            if (entry.getValue() != null) {
                result = result.replace("{{" + entry.getKey() + "}}", entry.getValue().toString());
            }
        }
        return result;
    }

    // ==========================================
    // Private Helpers
    // ==========================================

    private String resolveLanguage(String lang) {
        if (lang != null && lang.matches(SUPPORTED_LANGS_REGEX)) {
            return lang;
        }
        return "en";
    }

    private JsonNode loadTranslations(String lang) {
        return translationCache.computeIfAbsent(lang, l -> {
            try {
                ClassPathResource resource = new ClassPathResource("i18n/" + l + ".json");
                return objectMapper.readTree(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)
                );
            } catch (Exception e) {
                log.warn("Could not load i18n/{}.json, falling back to en.json", l);
                try {
                    ClassPathResource fallback = new ClassPathResource("i18n/en.json");
                    return objectMapper.readTree(
                        new InputStreamReader(fallback.getInputStream(), StandardCharsets.UTF_8)
                    );
                } catch (Exception ex) {
                    log.error("Could not load fallback i18n/en.json", ex);
                    return objectMapper.createObjectNode();
                }
            }
        });
    }

    /**
     * Rekursiv JSON-Knoten flach in Map einfügen.
     * z.B. email.verification.title → "verification.title" im Kontext
     * UND direkt als "title" wenn kein Konflikt besteht.
     */
    private void flattenNode(String prefix, JsonNode node, Map<String, Object> ctx) {
        if (node.isObject()) {
            node.fields().forEachRemaining(entry -> {
                String key = prefix.isEmpty() ? entry.getKey() : prefix + "." + entry.getKey();
                flattenNode(key, entry.getValue(), ctx);
                // Auch als einfachen Key ohne Prefix hinzufügen (für direkte Template-Verwendung)
                if (!ctx.containsKey(entry.getKey())) {
                    flattenNode(entry.getKey(), entry.getValue(), ctx);
                }
            });
        } else if (node.isTextual()) {
            ctx.put(prefix, node.asText());
        }
    }

    private String buildFallbackHtml(Map<String, Object> ctx) {
        String title = ctx.getOrDefault("title", "Markt.ma").toString();
        String intro = ctx.getOrDefault("intro", "").toString();
        return "<!DOCTYPE html><html><body style='font-family:Arial,sans-serif;padding:20px'>" +
               "<h2>" + title + "</h2><p>" + intro + "</p>" +
               "<p>Markt.ma Team</p></body></html>";
    }
}


package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import storebackend.dto.IssueImageAnalysisDTO;
import storebackend.exception.AiServiceException;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * OpenRouter AI Service – OpenAI-kompatibler Unified-AI-Zugang.
 *
 * Features:
 *  - Vision : Produktbilder als base64 direkt analysieren (kein MinIO nötig)
 *  - Text   : Chatbot-Fallback für unbekannte Kundenfragen
 *
 * Modelle (alle kostenlos):
 *  - Vision : google/gemma-4-31b-it:free  (Fallback: google/gemma-4-26b-a4b-it:free)
 *  - Text   : meta-llama/llama-3.1-8b-instruct:free
 *
 * Konfiguration: openrouter.api.key (Format: sk-or-v1-...)
 * API-Docs: https://openrouter.ai/docs
 */
@Service
@Slf4j
public class OpenRouterService {

    private static final String API_URL   = "https://openrouter.ai/api/v1/chat/completions";
    private static final String SITE_URL  = "https://markt.ma";
    private static final String SITE_NAME = "markt.ma";

    /** Kostenloses Vision-Modell (multimodal). Aktualisiert, da google/gemini-2.0-flash-exp:free bei OpenRouter nicht mehr verfügbar ist. */
    public static final String MODEL_VISION          = "google/gemma-4-31b-it:free";
    /** Fallback-Vision wenn Hauptmodell überlastet. Aktualisiert, da meta-llama/llama-3.2-11b-vision-instruct:free bei OpenRouter nicht mehr verfügbar ist. */
    public static final String MODEL_VISION_FALLBACK = "google/gemma-4-26b-a4b-it:free";
    /** Kostenloses Text-Modell für Chatbot-Fallback */
    public static final String MODEL_TEXT            = "meta-llama/llama-3.1-8b-instruct:free";

    /**
     * TEMP: Free-only Vision-Modell-Pool für den isolierten Issue-Analysis-Test
     * (Bild → Reparaturproblem als JSON). Nur Issue-Analysis – Produkt-Vision
     * (MODEL_VISION/MODEL_VISION_FALLBACK) bleibt unverändert.
     *
     * Quelle: GET https://openrouter.ai/api/v1/models (live geprüft am 07.09.2026).
     * Aufnahmekriterien: pricing.prompt == 0 UND pricing.image == 0 (":free"-Suffix)
     * UND architecture.input_modalities enthält "image". Kein Paid-Modell erlaubt.
     *
     * Reihenfolge – bevorzugt unterschiedliche Provider, Google zuletzt (aktuell
     * wiederholt Upstream-429 bei beiden Gemma-Free-Modellen beobachtet):
     *  1) thinkingmachines/inkling:free                              – Thinking Machines, free, image+text+audio
     *  2) nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free         – NVIDIA, free, image+text+audio+video
     *  3) openrouter/free                                            – OpenRouter-eigener Free-Router, image+text
     *  4) dots-studio/dots-3-note-preview:free                       – Dots Studio, free, image+text
     *     (Preview mit OpenRouter-Ablaufanzeige 30.09.2026 – bewusst NICHT als
     *      Haupt-Fallback vorne platziert, nur als vorletzte Option)
     *  5) google/gemma-4-31b-it:free                                 – Google, zuletzt wegen häufigem 429
     *  6) google/gemma-4-26b-a4b-it:free                             – Google, zuletzt wegen häufigem 429
     *
     * HINWEIS: "MiniMax M3 free" existiert bei OpenRouter NICHT als kostenloses
     * Vision-Modell (nur "minimax/minimax-m3", kostenpflichtig) – daher nicht im Pool.
     */
    private static final List<String> ISSUE_VISION_MODEL_POOL = List.of(
            "thinkingmachines/inkling:free",
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            "openrouter/free",
            "dots-studio/dots-3-note-preview:free",
            "google/gemma-4-31b-it:free",
            "google/gemma-4-26b-a4b-it:free"
    );

    /** Maximale Gesamtzahl an Modellversuchen pro Issue-Analysis-Aufruf (Pool wird ggf. nicht komplett ausgeschöpft). */
    private static final int ISSUE_VISION_MAX_ATTEMPTS = 4;

    /** HTTP-Status-Codes, bei denen zum nächsten Modell im Pool rotiert wird. 401 rotiert NICHT (Abbruch). */
    private static final List<Integer> ISSUE_VISION_RETRYABLE_STATUS = List.of(429, 502, 503);

    @Value("${openrouter.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public OpenRouterService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /** true wenn ein gültiger OpenRouter-Key konfiguriert ist */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && apiKey.startsWith("sk-or");
    }

    // ─────────────────────────────────────────────────────────────
    //  VISION – Produktbild → strukturiertes JSON (V2)
    // ─────────────────────────────────────────────────────────────

    /**
     * Analysiert ein Produktbild und liefert strukturiertes JSON.
     * Bild wird als base64 übertragen – kein MinIO-Upload nötig.
     *
     * @param imageBytes JPEG-komprimierte Bildbytes
     * @param language   "de", "en" oder "ar"
     * @return JSON-String: title, description, category, tags, suggestedPrice, seoTitle, metaDescription, slug
     */
    public String analyzeProductImage(byte[] imageBytes, String language) {
        ensureConfigured();
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        Map<String, Object> body = buildVisionBody(MODEL_VISION, base64, buildV2Prompt(language), 800);
        log.info("🤖 OpenRouter Vision V2 – model={}, lang={}, imageSize={}KB",
                MODEL_VISION, language, imageBytes.length / 1024);
        try {
            return callApi(body);
        } catch (AiServiceException e) {
            if (isRetryable(e.getMessage())) {
                log.warn("⚠️ Primary vision model failed ({}), retrying with fallback: {}",
                        e.getMessage(), MODEL_VISION_FALLBACK);
                Map<String, Object> fallbackBody = buildVisionBody(
                        MODEL_VISION_FALLBACK, base64, buildV2Prompt(language), 800);
                return callApi(fallbackBody);
            }
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  VISION – Produktbild → einfache Beschreibung (V1)
    // ─────────────────────────────────────────────────────────────

    /**
     * Einfache Bildbeschreibung für AiProductSuggestionDTO (V1).
     */
    public String describeProductImage(byte[] imageBytes, String language) {
        ensureConfigured();
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        Map<String, Object> body = buildVisionBody(MODEL_VISION, base64, buildV1Prompt(language), 400);
        log.info("🤖 OpenRouter Vision V1 – model={}, lang={}, imageSize={}KB",
                MODEL_VISION, language, imageBytes.length / 1024);
        try {
            return callApi(body);
        } catch (AiServiceException e) {
            if (isRetryable(e.getMessage())) {
                log.warn("⚠️ Primary vision model failed, retrying with fallback");
                Map<String, Object> fallbackBody = buildVisionBody(
                        MODEL_VISION_FALLBACK, base64, buildV1Prompt(language), 400);
                return callApi(fallbackBody);
            }
            throw e;
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  VISION – TEMP TEST: Reparatur-/Schadensbild → strukturiertes Issue-JSON
    // ─────────────────────────────────────────────────────────────

    /**
     * TEMP/isoliert: Analysiert ein Foto einer möglichen Reparatur-/Schadenssituation
     * (z. B. Sanitär, Elektrik, Heizung) und liefert ein strukturiertes {@link IssueImageAnalysisDTO}.
     * Nutzt dieselbe Vision-Infrastruktur wie {@link #analyzeProductImage}.
     *
     * Keine Businesslogik, keine Handwerker-Zuordnung, keine Persistenz – nur Bildanalyse.
     *
     * @param imageBytes JPEG-komprimierte Bildbytes
     * @param language   "de", "en" oder "ar"
     * @return geparste Issue-Analyse (category, problem, urgency, confidence, questions)
     */
    public IssueImageAnalysisDTO analyzeIssueImage(byte[] imageBytes, String language) {
        ensureConfigured();
        String base64 = Base64.getEncoder().encodeToString(imageBytes);
        String prompt = buildIssuePrompt(language);

        int attempts = Math.min(ISSUE_VISION_MAX_ATTEMPTS, ISSUE_VISION_MODEL_POOL.size());
        AiServiceException lastError = null;

        for (int i = 0; i < attempts; i++) {
            String model = ISSUE_VISION_MODEL_POOL.get(i);
            String provider = model.contains("/") ? model.substring(0, model.indexOf('/')) : model;
            int attemptNumber = i + 1;

            try {
                Map<String, Object> body = buildVisionBody(model, base64, prompt, 500);
                String raw = callApi(body);
                log.info("✅ OpenRouter Issue-Analysis (TEST) – attempt={}, model={}, status=200, provider={}",
                        attemptNumber, model, provider);
                return parseIssueJson(raw);

            } catch (OpenRouterCallException e) {
                lastError = e;
                log.warn("⚠️ OpenRouter Issue-Analysis (TEST) – attempt={}, model={}, status={}, provider={}",
                        attemptNumber, model, e.getStatusCode(), provider);

                if (e.getStatusCode() == 401) {
                    // Kein Rotieren bei Auth-Fehlern – Key-Problem betrifft alle Modelle gleichermaßen.
                    throw e;
                }
                if (!ISSUE_VISION_RETRYABLE_STATUS.contains(e.getStatusCode())) {
                    // Nicht-retryable Fehler (z. B. 400, 404) – Pool-Rotation bringt nichts.
                    throw e;
                }
                // sonst: nächstes Modell im Pool versuchen

            } catch (AiServiceException e) {
                // Nicht-HTTP-Fehler (z. B. Parsing) – nicht retryable, sofort abbrechen.
                log.warn("⚠️ OpenRouter Issue-Analysis (TEST) – attempt={}, model={}, status=n/a, provider={}",
                        attemptNumber, model, provider);
                throw e;
            }
        }

        throw lastError != null ? lastError
                : new AiServiceException("OpenRouter issue-analysis failed: no vision model in pool responded.");
    }

    /**
     * {@link AiServiceException}-Subklasse, die zusätzlich den echten HTTP-Statuscode trägt –
     * wird nur intern in {@link #callApi(Map)} geworfen, damit der Free-Vision-Pool in
     * {@link #analyzeIssueImage(byte[], String)} anhand des Statuscodes entscheiden kann,
     * ob rotiert wird (429/502/503) oder abgebrochen wird (401 und alle anderen).
     * Bestehende catch(AiServiceException)-Stellen (Produkt-Vision, Chatbot) bleiben
     * unverändert funktionsfähig, da diese Klasse eine Subklasse ist.
     */
    private static final class OpenRouterCallException extends AiServiceException {
        private final int statusCode;

        OpenRouterCallException(String message, int statusCode) {
            super(message);
            this.statusCode = statusCode;
        }

        int getStatusCode() {
            return statusCode;
        }
    }

    /**
     * Parst die Issue-JSON-Antwort. Wiederverwendet die bestehende Markdown-Cleanup-Logik
     * aus {@link AiImageCaptioningService#cleanJsonResponse(String)}.
     */
    private IssueImageAnalysisDTO parseIssueJson(String jsonText) {
        try {
            String cleanedJson = AiImageCaptioningService.cleanJsonResponse(jsonText);
            JsonNode node = objectMapper.readTree(cleanedJson);

            IssueImageAnalysisDTO dto = new IssueImageAnalysisDTO();
            dto.setCategory(node.path("category").asText("OTHER"));
            dto.setProblem(node.path("problem").asText(""));
            dto.setUrgency(node.path("urgency").asText("MEDIUM"));
            dto.setConfidence(node.has("confidence") && !node.get("confidence").isNull()
                    ? node.get("confidence").asDouble() : null);

            List<String> questions = new ArrayList<>();
            if (node.has("questions") && node.get("questions").isArray()) {
                node.get("questions").forEach(q -> questions.add(q.asText()));
            }
            dto.setQuestions(questions);

            return dto;
        } catch (AiServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new AiServiceException("Failed to parse OpenRouter issue-analysis response: " + e.getMessage(), e);
        }
    }

    private String buildIssuePrompt(String language) {
        String langName = switch (language != null ? language.toLowerCase() : "de") {
            case "en" -> "English";
            case "ar" -> "Arabic";
            default   -> "German";
        };

        return "You are analyzing a photo that may show a household repair or damage situation " +
               "(e.g. plumbing, electrical, heating, appliance, door/window, wall/ceiling, floor, roof).\n\n" +
               "IMPORTANT RULES:\n" +
               "- Only describe what is VISIBLY plausible in the image. Never invent or state a diagnosis as a certain fact.\n" +
               "- If the image is unclear, ambiguous, or does not clearly show a problem, set \"confidence\" LOW (below 0.5) " +
               "and add clarifying questions to \"questions\".\n" +
               "- If no relevant issue is visible at all, still return the JSON structure, using category \"OTHER\", " +
               "a short neutral \"problem\" text, \"urgency\": \"LOW\" and a low \"confidence\".\n\n" +
               "Allowed \"category\" values (choose exactly one): " +
               "SANITARY, ELECTRICAL, HEATING, APPLIANCE, DOOR_WINDOW, WALL_CEILING, FLOOR, ROOF, OTHER\n" +
               "Allowed \"urgency\" values (choose exactly one): LOW, MEDIUM, HIGH, EMERGENCY\n\n" +
               "Respond with ONLY a valid JSON object, all text fields in " + langName + ", using exactly this structure:\n" +
               "{\n" +
               "  \"category\": \"SANITARY\",\n" +
               "  \"problem\": \"Short factual description of the visible issue\",\n" +
               "  \"urgency\": \"MEDIUM\",\n" +
               "  \"confidence\": 0.88,\n" +
               "  \"questions\": [\"One or more clarifying questions if needed, otherwise an empty array\"]\n" +
               "}\n" +
               "Return ONLY the JSON object. No markdown code fences. No extra text.";
    }

    // ─────────────────────────────────────────────────────────────
    //  TEXT – Chatbot-KI-Fallback
    // ─────────────────────────────────────────────────────────────

    /**
     * Beantwortet eine Kundenfrage im Store-Kontext mit KI.
     *
     * @param userMessage  Kundennachricht (normalisiert)
     * @param storeContext Kurze Store-Info (Name etc.) – darf null sein
     * @param language     "de", "en" oder "ar"
     * @return KI-generierte Antwort (max. 2–3 Sätze)
     */
    public String answerCustomerQuestion(String userMessage, String storeContext, String language) {
        ensureConfigured();
        Map<String, Object> body = Map.of(
                "model", MODEL_TEXT,
                "messages", List.of(
                        Map.of("role", "system", "content", buildChatbotSystemPrompt(storeContext, language)),
                        Map.of("role", "user",   "content", userMessage)
                ),
                "max_tokens", 300
        );
        log.info("🤖 OpenRouter Chatbot – model={}, lang={}", MODEL_TEXT, language);
        return callApi(body);
    }

    // ─────────────────────────────────────────────────────────────
    //  Private Helpers
    // ─────────────────────────────────────────────────────────────

    private Map<String, Object> buildVisionBody(String model, String base64Image,
                                                 String prompt, int maxTokens) {
        return Map.of(
                "model", model,
                "messages", List.of(Map.of(
                        "role", "user",
                        "content", List.of(
                                Map.of("type", "text", "text", prompt),
                                Map.of("type", "image_url",
                                       "image_url", Map.of("url", "data:image/jpeg;base64," + base64Image))
                        )
                )),
                "max_tokens", maxTokens
        );
    }

    private String callApi(Map<String, Object> requestBody) {
        Object model = requestBody.get("model");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);
        headers.set("HTTP-Referer", SITE_URL);   // Von OpenRouter empfohlen
        headers.set("X-Title",      SITE_NAME);  // Von OpenRouter empfohlen

        try {
            String json = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> entity = new HttpEntity<>(json, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    API_URL, HttpMethod.POST, entity, String.class);

            return extractContent(response.getBody());

        } catch (HttpClientErrorException e) {
            logHttpStatusError(e, model);
            int status = e.getStatusCode().value();
            String msg = switch (status) {
                case 401 -> "Invalid OpenRouter API key. Check OPENROUTER_API_KEY.";
                case 402 -> "OpenRouter credits exhausted. Top up at openrouter.ai.";
                case 429 -> "OpenRouter rate limit exceeded. Try again in a moment.";
                case 503 -> "OpenRouter model unavailable. Try again later.";
                default  -> "OpenRouter HTTP " + status + ": " + e.getStatusText();
            };
            throw new OpenRouterCallException(msg, status);

        } catch (HttpServerErrorException e) {
            logHttpStatusError(e, model);
            int status = e.getStatusCode().value();
            throw new OpenRouterCallException("OpenRouter server error (5xx). Try again later.", status);

        } catch (AiServiceException e) {
            throw e;

        } catch (Exception e) {
            log.error("OpenRouter call failed: {}", e.getMessage(), e);
            throw new AiServiceException("OpenRouter call failed: " + e.getMessage(), e);
        }
    }

    /**
     * Diagnose-Logging für fehlgeschlagene OpenRouter-Aufrufe (4xx/5xx).
     * Loggt Status(+Text), Request-URL, verwendetes Modell, Response-Body und unkritische
     * Response-Header (z. B. request-id/cf-ray für den Support-Abgleich mit OpenRouter).
     *
     * WICHTIG: Loggt NIEMALS den API-Key, den Authorization-Header, Cookies oder den
     * vollständigen Request-Body (der Base64-Bilddaten enthalten kann) – nur Status,
     * URL, Modellname sowie gefilterte Response-Header/Response-Body.
     */
    private void logHttpStatusError(HttpStatusCodeException e, Object model) {
        String body = e.getResponseBodyAsString();
        String safeHeaders = formatSafeHeaders(e.getResponseHeaders());

        log.error("❌ OpenRouter HTTP {} {} – url={}, model={}, headers=[{}], body={}",
                e.getStatusCode().value(), e.getStatusText(), API_URL, model, safeHeaders,
                (body == null || body.isBlank()) ? "<empty>" : body);

        // Gezielt bekannte Tracing/Request-ID-Header prüfen (request-id, cf-ray, x-request-id,
        // openrouter-*, ...) – hilfreich für den Support-Abgleich mit OpenRouter, insbesondere
        // wenn der Response-Body leer ist.
        String traceHeaders = formatTraceHeaders(e.getResponseHeaders());
        if (!"<none>".equals(traceHeaders)) {
            log.error("ℹ️ OpenRouter trace headers: [{}]", traceHeaders);
        }
    }

    /** Header-Namen, die niemals geloggt werden dürfen (auch nicht aus der Response). */
    private static final List<String> SENSITIVE_HEADER_NAMES = List.of(
            "authorization", "set-cookie", "cookie", "proxy-authorization", "x-api-key"
    );

    /** Formatiert Response-Header als "name=value" Liste, ohne sensible Header. */
    private String formatSafeHeaders(HttpHeaders responseHeaders) {
        if (responseHeaders == null || responseHeaders.isEmpty()) {
            return "<none>";
        }
        StringBuilder sb = new StringBuilder();
        responseHeaders.forEach((name, values) -> {
            if (SENSITIVE_HEADER_NAMES.contains(name.toLowerCase())) {
                return;
            }
            if (sb.length() > 0) sb.append(", ");
            sb.append(name).append("=").append(String.join("|", values));
        });
        return sb.length() > 0 ? sb.toString() : "<none>";
    }

    /** Namen typischer Tracing/Request-ID-Header, wie sie OpenRouter (Cloudflare-basiert) setzt. */
    private static final List<String> TRACE_HEADER_NAMES = List.of(
            "request-id", "x-request-id", "cf-ray", "cf-cache-status", "x-openrouter-request-id"
    );

    /**
     * Extrahiert nur bekannte Tracing/Request-ID-Header (request-id, cf-ray, x-request-id,
     * openrouter-* per Prefix) – für Support-Abgleich mit OpenRouter, insbesondere falls
     * der Response-Body leer ist.
     */
    private String formatTraceHeaders(HttpHeaders responseHeaders) {
        if (responseHeaders == null || responseHeaders.isEmpty()) {
            return "<none>";
        }
        StringBuilder sb = new StringBuilder();
        responseHeaders.forEach((name, values) -> {
            String lower = name.toLowerCase();
            boolean isTraceHeader = TRACE_HEADER_NAMES.contains(lower) || lower.startsWith("openrouter-");
            if (!isTraceHeader) {
                return;
            }
            if (sb.length() > 0) sb.append(", ");
            sb.append(name).append("=").append(String.join("|", values));
        });
        return sb.length() > 0 ? sb.toString() : "<none>";
    }

    private String extractContent(String jsonResponse) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);

            // Standard OpenAI-Format: choices[0].message.content
            if (root.has("choices") && root.get("choices").isArray()
                    && root.get("choices").size() > 0) {
                JsonNode content = root.get("choices").get(0).path("message").path("content");
                if (!content.isMissingNode() && !content.isNull()) {
                    log.debug("✅ OpenRouter response ({} chars)", content.asText().length());
                    return content.asText();
                }
            }

            // Fehler-Response auswerten
            if (root.has("error")) {
                JsonNode error = root.get("error");
                String msg = error.has("message") ? error.get("message").asText() : error.toString();
                throw new AiServiceException("OpenRouter API error: " + msg);
            }

            log.error("Unexpected OpenRouter response format: {}", jsonResponse);
            throw new AiServiceException("Could not parse OpenRouter response");

        } catch (AiServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new AiServiceException("Failed to parse OpenRouter response: " + e.getMessage(), e);
        }
    }

    private boolean isRetryable(String errorMessage) {
        return errorMessage != null &&
               (errorMessage.contains("rate limit") || errorMessage.contains("unavailable"));
    }

    private void ensureConfigured() {
        if (!isConfigured()) {
            throw new AiServiceException(
                "OpenRouter API key not configured. Set OPENROUTER_API_KEY env var (format: sk-or-v1-...).");
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  Prompts
    // ─────────────────────────────────────────────────────────────

    private String buildV1Prompt(String language) {
        return switch (language != null ? language.toLowerCase() : "en") {
            case "de" -> "Beschreibe dieses Produktbild detailliert auf Deutsch. " +
                         "Konzentriere dich auf den Hauptartikel, seine Merkmale, Farbe und Stil. Sei präzise.";
            case "ar" -> "صف صورة المنتج هذه بالتفصيل باللغة العربية. " +
                         "ركز على العنصر الرئيسي وميزاته ولونه وأسلوبه. كن موجزاً.";
            default   -> "Describe this product image in detail. " +
                         "Focus on the main item, its features, color, and style. Be concise.";
        };
    }

    private String buildV2Prompt(String language) {
        String langName = switch (language != null ? language.toLowerCase() : "en") {
            case "de" -> "German";
            case "ar" -> "Arabic";
            default   -> "English";
        };
        String titleExample = switch (language != null ? language.toLowerCase() : "en") {
            case "de" -> "Hochwertiger Holztisch";
            case "ar" -> "طاولة خشبية عالية الجودة";
            default   -> "Premium Wooden Table";
        };

        return "Analyze this product image and respond with ONLY a valid JSON object. " +
               "All text fields must be in " + langName + ". Use this exact structure:\n" +
               "{\n" +
               "  \"title\": \"" + titleExample + "\",\n" +
               "  \"description\": \"Detailed 2-3 sentence product description\",\n" +
               "  \"category\": \"Product category\",\n" +
               "  \"tags\": [\"tag1\", \"tag2\", \"tag3\"],\n" +
               "  \"seoTitle\": \"SEO optimized title (max 60 chars)\",\n" +
               "  \"metaDescription\": \"SEO meta description (max 160 chars)\",\n" +
               "  \"slug\": \"url-friendly-slug\",\n" +
               "  \"suggestedPrice\": 29.99\n" +
               "}\n" +
               "Return ONLY the JSON object. No markdown code fences. No extra text.";
    }

    private String buildChatbotSystemPrompt(String storeContext, String language) {
        String lang = language != null ? language.toLowerCase() : "de";
        String langInstruction = switch (lang) {
            case "de" -> "Antworte IMMER auf Deutsch. Sei freundlich und hilfsbereit.";
            case "ar" -> "أجب دائماً باللغة العربية. كن ودوداً ومفيداً.";
            default   -> "Always respond in English. Be friendly and helpful.";
        };
        String ctx = storeContext != null && !storeContext.isBlank()
                ? "\nStore-Kontext: " + storeContext
                : "";

        return "Du bist ein Kundenservice-Assistent für einen Online-Shop auf markt.ma. " +
               langInstruction + ctx + "\n\n" +
               "Regeln:\n" +
               "- Halte Antworten kurz (max. 2-3 Sätze)\n" +
               "- Erfinde niemals Preise, Lagerbestände oder Bestelldetails\n" +
               "- Bei Unklarheit: 'Kontaktieren Sie uns per WhatsApp für weitere Hilfe.'\n" +
               "- Nur Kundenservice-Themen: Bestellungen, Produkte, Versand, Retouren";
    }
}


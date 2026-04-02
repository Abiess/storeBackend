package storebackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import storebackend.exception.AiServiceException;

import java.util.List;
import java.util.Map;

/**
 * AI Model Provider Interface - ermöglicht Switching zwischen verschiedenen AI-Modellen
 * WICHTIG: Bestehendes System bleibt unverändert, dies ist eine ERWEITERUNG
 */
@Service
@Slf4j
public class AiModelProvider {

    // Bestehende Konfiguration bleibt erhalten
    private static final String HUGGINGFACE_ROUTER_API = "https://router.huggingface.co/v1/responses";
    private static final String HUGGINGFACE_INFERENCE_API = "https://api-inference.huggingface.co/models/";

    // Verfügbare Modelle
    public static final String MODEL_GLM_4_5V = "zai-org/GLM-4.5V"; // Bestehendes Modell (Router API)
    public static final String MODEL_BLIP = "Salesforce/blip-image-captioning-large"; // Neues kostenloses Modell (Inference API)

    @Value("${huggingface.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    public AiModelProvider(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Ruft das ausgewählte Modell auf
     * @param modelName Name des Modells (MODEL_GLM_4_5V oder MODEL_BLIP)
     * @param imageUrl Externe URL des Bildes (für Router API) oder null (für Inference API)
     * @param imageBytes Bild-Bytes (für Inference API)
     * @param language Sprache für den Response
     * @param isV2 Ob V2-Format (JSON) gewünscht ist
     * @return Response String vom AI-Modell
     */
    public String callModel(String modelName, String imageUrl, byte[] imageBytes, String language, boolean isV2) {
        log.info("🤖 Calling AI Model: {}", modelName);

        switch (modelName) {
            case MODEL_GLM_4_5V:
                return callGLMModel(imageUrl, language, isV2);
            case MODEL_BLIP:
                return callBLIPModel(imageBytes);
            default:
                log.warn("Unknown model: {}, falling back to GLM-4.5V", modelName);
                return callGLMModel(imageUrl, language, isV2);
        }
    }

    /**
     * Ruft das bestehende GLM-4.5V Modell auf (Router API)
     * KEINE ÄNDERUNG am bestehenden Verhalten
     */
    private String callGLMModel(String imageUrl, String language, boolean isV2) {
        try {
            log.info("Calling GLM-4.5V via Router API");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            String prompt = isV2 ? buildV2PromptForLanguage(language) : buildV1PromptForLanguage(language);

            Map<String, Object> requestBody = Map.of(
                "model", MODEL_GLM_4_5V,
                "input", List.of(
                    Map.of(
                        "role", "user",
                        "content", List.of(
                            Map.of("type", "text", "text", prompt),
                            Map.of("type", "image_url", "image_url", Map.of("url", imageUrl))
                        )
                    )
                ),
                "stream", false,
                "max_tokens", 500
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                HUGGINGFACE_ROUTER_API,
                HttpMethod.POST,
                entity,
                String.class
            );

            return extractTextFromRouterResponse(response.getBody());

        } catch (Exception e) {
            log.error("Error calling GLM-4.5V model", e);
            throw new AiServiceException("Failed to call GLM-4.5V model: " + e.getMessage());
        }
    }

    /**
     * Ruft das neue kostenlose BLIP Modell auf (Inference API)
     * NEU - zusätzliches kostenloses Modell
     */
    private String callBLIPModel(byte[] imageBytes) {
        try {
            log.info("Calling BLIP via Inference API (free)");

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.set("Authorization", "Bearer " + apiKey);

            HttpEntity<byte[]> entity = new HttpEntity<>(imageBytes, headers);

            String url = HUGGINGFACE_INFERENCE_API + MODEL_BLIP;
            ResponseEntity<String> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                String.class
            );

            return extractTextFromInferenceResponse(response.getBody());

        } catch (Exception e) {
            log.error("Error calling BLIP model", e);
            throw new AiServiceException("Failed to call BLIP model: " + e.getMessage());
        }
    }

    // Helper-Methoden

    private String buildV1PromptForLanguage(String language) {
        switch (language.toLowerCase()) {
            case "de":
                return "Beschreibe dieses Produktbild kurz und präzise auf Deutsch. Was siehst du?";
            case "ar":
                return "صف هذه الصورة للمنتج بإيجاز ودقة. ماذا ترى؟";
            default:
                return "Describe this product image briefly and precisely. What do you see?";
        }
    }

    private String buildV2PromptForLanguage(String language) {
        switch (language.toLowerCase()) {
            case "de":
                return "Analysiere dieses Produktbild und gib die Informationen als JSON zurück:\n" +
                       "{\n" +
                       "  \"title\": \"Produktname\",\n" +
                       "  \"description\": \"Detaillierte Beschreibung\",\n" +
                       "  \"category\": \"Kategorie\",\n" +
                       "  \"tags\": [\"tag1\", \"tag2\"],\n" +
                       "  \"suggestedPrice\": 0.0\n" +
                       "}";
            case "ar":
                return "حلل صورة المنتج هذه وأرجع المعلومات بصيغة JSON:\n" +
                       "{\n" +
                       "  \"title\": \"اسم المنتج\",\n" +
                       "  \"description\": \"وصف تفصيلي\",\n" +
                       "  \"category\": \"الفئة\",\n" +
                       "  \"tags\": [\"وسم1\", \"وسم2\"],\n" +
                       "  \"suggestedPrice\": 0.0\n" +
                       "}";
            default:
                return "Analyze this product image and return the information as JSON:\n" +
                       "{\n" +
                       "  \"title\": \"Product Name\",\n" +
                       "  \"description\": \"Detailed description\",\n" +
                       "  \"category\": \"Category\",\n" +
                       "  \"tags\": [\"tag1\", \"tag2\"],\n" +
                       "  \"suggestedPrice\": 0.0\n" +
                       "}";
        }
    }

    private String extractTextFromRouterResponse(String jsonResponse) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(jsonResponse);

            if (root.has("choices") && root.get("choices").isArray() && root.get("choices").size() > 0) {
                com.fasterxml.jackson.databind.JsonNode firstChoice = root.get("choices").get(0);
                if (firstChoice.has("message") && firstChoice.get("message").has("content")) {
                    return firstChoice.get("message").get("content").asText();
                }
            }

            return jsonResponse;
        } catch (Exception e) {
            log.warn("Could not parse Router API response, returning raw: {}", e.getMessage());
            return jsonResponse;
        }
    }

    private String extractTextFromInferenceResponse(String jsonResponse) {
        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(jsonResponse);

            // BLIP returns: [{"generated_text": "a photo of ..."}]
            if (root.isArray() && root.size() > 0) {
                com.fasterxml.jackson.databind.JsonNode first = root.get(0);
                if (first.has("generated_text")) {
                    return first.get("generated_text").asText();
                }
            }

            return jsonResponse;
        } catch (Exception e) {
            log.warn("Could not parse Inference API response, returning raw: {}", e.getMessage());
            return jsonResponse;
        }
    }

    /**
     * Gibt Liste verfügbarer Modelle zurück
     */
    public List<String> getAvailableModels() {
        return List.of(MODEL_GLM_4_5V, MODEL_BLIP);
    }

    /**
     * Gibt Default-Modell zurück (bestehendes Modell bleibt Default)
     */
    public String getDefaultModel() {
        return MODEL_GLM_4_5V;
    }
}


package storebackend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import storebackend.dto.AiProductSuggestionDTO;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;

@Service
@Slf4j
public class AiImageCaptioningService {

    // New v1 API endpoint - supports JSON + base64 images
    private static final String HUGGINGFACE_API_URL = "https://api.huggingface.co/v1/chat/completions";
    private static final String MODEL_NAME = "meta-llama/Llama-3.2-11B-Vision-Instruct";

    @Value("${huggingface.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiImageCaptioningService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        log.info("🤖 AiImageCaptioningService initialized");
        log.info("🔑 API Key configured: {}", apiKey != null && !apiKey.isBlank() ? "YES" : "NO");
    }

    /**
     * Generates product suggestions from an uploaded image using Hugging Face AI
     */
    public AiProductSuggestionDTO generateProductSuggestion(MultipartFile imageFile) throws IOException {
        log.info("=== AI GENERATION START ===");
        log.info("Image: {} ({} bytes)", imageFile.getOriginalFilename(), imageFile.getSize());
        log.info("API Key present: {}", apiKey != null && !apiKey.isBlank());
        
        if (apiKey == null || apiKey.isBlank()) {
            log.error("❌ Hugging Face API key is not configured!");
            throw new RuntimeException("Hugging Face API key is not configured. Please set HUGGINGFACE_API_KEY environment variable.");
        }

        log.info("Generating AI product suggestion for image: {}", imageFile.getOriginalFilename());

        // Convert image to bytes
        byte[] imageBytes = imageFile.getBytes();

        // Call Hugging Face API
        String caption = callHuggingFaceApi(imageBytes);

        log.info("AI generated caption: {}", caption);

        // Generate product title and description from caption
        AiProductSuggestionDTO suggestion = new AiProductSuggestionDTO();
        suggestion.setGeneratedCaption(caption);
        suggestion.setTitle(generateTitle(caption));
        suggestion.setDescription(generateDescription(caption));

        return suggestion;
    }

    /**
     * Calls Hugging Face API for image captioning using new v1 API
     */
    private String callHuggingFaceApi(byte[] imageBytes) throws IOException {
        try {
            log.info("Calling Hugging Face v1 API: {}", HUGGINGFACE_API_URL);
            
            // Encode image to base64
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            log.info("Image encoded to base64 ({} chars)", base64Image.length());
            
            // Create headers for JSON request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            // Build request body with new v1 format
            Map<String, Object> requestBody = Map.of(
                "model", MODEL_NAME,
                "messages", java.util.List.of(
                    Map.of(
                        "role", "user",
                        "content", java.util.List.of(
                            Map.of("type", "text", "text", "Describe this product image in detail. Focus on the main item, its features, color, and style."),
                            Map.of("type", "image_url", "image_url", Map.of("url", "data:image/jpeg;base64," + base64Image))
                        )
                    )
                ),
                "max_tokens", 500,
                "stream", false
            );

            // Convert to JSON
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            
            // Create request entity
            HttpEntity<String> requestEntity = new HttpEntity<>(jsonBody, headers);

            // Call API with timeout handling
            ResponseEntity<String> response;
            try {
                response = restTemplate.exchange(
                    HUGGINGFACE_API_URL,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
                );
            } catch (Exception e) {
                log.error("API call failed: {}", e.getMessage());
                
                // Check if it's a 410 Gone error (model deprecated)
                if (e.getMessage().contains("410") || e.getMessage().contains("Gone")) {
                    throw new IOException("The AI model is no longer available. Please update to a newer model. Error: " + e.getMessage());
                }
                
                // Check if model is loading
                if (e.getMessage().contains("503") || e.getMessage().contains("loading")) {
                    throw new IOException("AI model is currently loading. Please wait 20-30 seconds and try again.");
                }
                
                throw new IOException("Failed to call Hugging Face API: " + e.getMessage(), e);
            }

            // Parse v1 API response
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("API response received, parsing v1 format...");
                JsonNode jsonNode = objectMapper.readTree(response.getBody());
                
                // v1 API response format: { "choices": [{ "message": { "content": "..." } }] }
                if (jsonNode.has("choices") && jsonNode.get("choices").isArray()) {
                    JsonNode choices = jsonNode.get("choices");
                    if (!choices.isEmpty()) {
                        JsonNode firstChoice = choices.get(0);
                        if (firstChoice.has("message") && firstChoice.get("message").has("content")) {
                            String caption = firstChoice.get("message").get("content").asText();
                            log.info("Caption generated: {}", caption);
                            return caption;
                        }
                    }
                }
                
                log.error("Unexpected v1 API response format: {}", response.getBody());
            }

            throw new RuntimeException("Failed to parse Hugging Face v1 API response");

        } catch (IOException e) {
            throw e; // Re-throw IOException as-is
        } catch (Exception e) {
            log.error("Error calling Hugging Face v1 API: {}", e.getMessage(), e);
            throw new IOException("Failed to generate caption: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a product title from the AI caption
     */
    private String generateTitle(String caption) {
        // Capitalize first letter and limit length
        String title = caption.trim();
        if (!title.isEmpty()) {
            title = title.substring(0, 1).toUpperCase() + title.substring(1);
        }
        
        // Limit to 80 characters
        if (title.length() > 80) {
            title = title.substring(0, 77) + "...";
        }
        
        return title;
    }

    /**
     * Generates a product description from the AI caption
     */
    private String generateDescription(String caption) {
        // Create a more detailed description
        String description = caption.trim();
        if (!description.isEmpty()) {
            description = description.substring(0, 1).toUpperCase() + description.substring(1);
        }
        
        // Add some standard text
        return description + "\n\nThis product description was generated using AI image analysis. Please review and edit as needed.";
    }
}


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

    private static final String HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base";

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
     * Calls Hugging Face API for image captioning
     */
    private String callHuggingFaceApi(byte[] imageBytes) throws IOException {
        try {
            // Create headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.set("Authorization", "Bearer " + apiKey);

            // Create request entity
            HttpEntity<byte[]> requestEntity = new HttpEntity<>(imageBytes, headers);

            // Call API
            ResponseEntity<String> response = restTemplate.exchange(
                HUGGINGFACE_API_URL,
                HttpMethod.POST,
                requestEntity,
                String.class
            );

            // Parse response
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode jsonNode = objectMapper.readTree(response.getBody());
                
                // Handle array response
                if (jsonNode.isArray() && !jsonNode.isEmpty()) {
                    JsonNode firstResult = jsonNode.get(0);
                    if (firstResult.has("generated_text")) {
                        return firstResult.get("generated_text").asText();
                    }
                }
                
                // Handle single object response
                if (jsonNode.has("generated_text")) {
                    return jsonNode.get("generated_text").asText();
                }
            }

            throw new RuntimeException("Failed to parse Hugging Face API response");

        } catch (Exception e) {
            log.error("Error calling Hugging Face API: {}", e.getMessage(), e);
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


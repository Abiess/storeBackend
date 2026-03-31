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

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Map;

@Service
@Slf4j
public class AiImageCaptioningService {

    // Using Hugging Face Router API with JSON + base64 format
    private static final String HUGGINGFACE_API_URL = "https://router.huggingface.co/v1/responses";
    private static final String MODEL_NAME = "meta-llama/Llama-3.2-11B-Vision-Instruct";
    
    // Image compression settings
    private static final int MAX_IMAGE_WIDTH = 1024;
    private static final int MAX_IMAGE_HEIGHT = 1024;
    private static final float JPEG_QUALITY = 0.85f;
    private static final int MAX_BASE64_SIZE = 5_000_000; // ~5MB base64 limit

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

        // Convert and compress image to optimized JPEG
        byte[] imageBytes = imageFile.getBytes();
        byte[] optimizedImageBytes = compressAndResizeImage(imageBytes);
        
        log.info("Image optimized: {} bytes → {} bytes", imageBytes.length, optimizedImageBytes.length);

        // Call Hugging Face API
        String caption = callHuggingFaceApi(optimizedImageBytes);

        log.info("AI generated caption: {}", caption);

        // Generate product title and description from caption
        AiProductSuggestionDTO suggestion = new AiProductSuggestionDTO();
        suggestion.setGeneratedCaption(caption);
        suggestion.setTitle(generateTitle(caption));
        suggestion.setDescription(generateDescription(caption));

        return suggestion;
    }

    /**
     * Calls Hugging Face Router API with JSON + base64 format
     */
    private String callHuggingFaceApi(byte[] imageBytes) throws IOException {
        try {
            log.info("Calling Hugging Face Router API: {}", HUGGINGFACE_API_URL);
            log.info("Model: {}", MODEL_NAME);
            
            // Encode image to base64
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);
            log.info("Image encoded to base64 ({} chars)", base64Image.length());
            
            // Create headers for JSON request
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            // Build request body with correct Router API responses format
            // Use role: "user" with content array
            String dataUri = "data:image/jpeg;base64," + base64Image;
            
            Map<String, Object> requestBody = Map.of(
                "model", MODEL_NAME,
                "input", java.util.List.of(
                    Map.of(
                        "role", "user",
                        "content", java.util.List.of(
                            Map.of(
                                "type", "text",
                                "text", "Describe this product image in detail. Focus on the main item, its features, color, and style. Be concise."
                            ),
                            Map.of(
                                "type", "image_url",
                                "image_url", Map.of("url", dataUri)
                            )
                        )
                    )
                )
            );

            // Convert to JSON
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.info("Request body size: {} chars", jsonBody.length());
            
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
                
                throw new IOException("Failed to call Hugging Face Router API: " + e.getMessage(), e);
            }

            // Parse Router API response
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("API response received, parsing Router API format...");
                log.info("Response: {}", response.getBody());
                
                JsonNode jsonNode = objectMapper.readTree(response.getBody());
                
                // PRIMARY: Router API response format: output[0].content[0].text
                if (jsonNode.has("output") && jsonNode.get("output").isArray()) {
                    JsonNode output = jsonNode.get("output");
                    if (!output.isEmpty() && output.get(0).has("content")) {
                        JsonNode content = output.get(0).get("content");
                        if (content.isArray() && !content.isEmpty() && content.get(0).has("text")) {
                            String caption = content.get(0).get("text").asText();
                            log.info("Caption generated from output[0].content[0].text: {}", caption);
                            return caption;
                        }
                    }
                }
                
                // FALLBACK: Direct text field
                if (jsonNode.has("text")) {
                    String caption = jsonNode.get("text").asText();
                    log.info("Caption generated from text field: {}", caption);
                    return caption;
                }
                
                // FALLBACK: generated_text field
                if (jsonNode.has("generated_text")) {
                    String caption = jsonNode.get("generated_text").asText();
                    log.info("Caption generated from generated_text field: {}", caption);
                    return caption;
                }
                
                // FALLBACK: outputs array format
                if (jsonNode.has("outputs") && jsonNode.get("outputs").isArray()) {
                    JsonNode outputs = jsonNode.get("outputs");
                    if (!outputs.isEmpty() && outputs.get(0).has("text")) {
                        String caption = outputs.get(0).get("text").asText();
                        log.info("Caption generated from outputs[0].text: {}", caption);
                        return caption;
                    }
                }
                
                log.error("Unexpected Router API response format: {}", response.getBody());
            }

            throw new RuntimeException("Failed to parse Hugging Face Router API response");

        } catch (IOException e) {
            throw e; // Re-throw IOException as-is
        } catch (Exception e) {
            log.error("Error calling Hugging Face Router API: {}", e.getMessage(), e);
            throw new IOException("Failed to generate caption: " + e.getMessage(), e);
        }
    }
    
    /**
     * Compresses and resizes image to reduce base64 size
     * Converts to JPEG format with quality optimization
     */
    private byte[] compressAndResizeImage(byte[] originalImageBytes) throws IOException {
        try {
            // Read original image
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(originalImageBytes));
            if (originalImage == null) {
                log.warn("Could not read image, using original bytes");
                return originalImageBytes;
            }
            
            int originalWidth = originalImage.getWidth();
            int originalHeight = originalImage.getHeight();
            log.info("Original image dimensions: {}x{}", originalWidth, originalHeight);
            
            // Calculate new dimensions maintaining aspect ratio
            int newWidth = originalWidth;
            int newHeight = originalHeight;
            
            if (originalWidth > MAX_IMAGE_WIDTH || originalHeight > MAX_IMAGE_HEIGHT) {
                double widthRatio = (double) MAX_IMAGE_WIDTH / originalWidth;
                double heightRatio = (double) MAX_IMAGE_HEIGHT / originalHeight;
                double ratio = Math.min(widthRatio, heightRatio);
                
                newWidth = (int) (originalWidth * ratio);
                newHeight = (int) (originalHeight * ratio);
                log.info("Resizing image to: {}x{}", newWidth, newHeight);
            }
            
            // Create resized image
            BufferedImage resizedImage = new BufferedImage(newWidth, newHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = resizedImage.createGraphics();
            
            // Enable high-quality rendering
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            
            graphics.drawImage(originalImage, 0, 0, newWidth, newHeight, null);
            graphics.dispose();
            
            // Compress to JPEG
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            javax.imageio.ImageWriter jpegWriter = ImageIO.getImageWritersByFormatName("jpeg").next();
            javax.imageio.ImageWriteParam jpegWriteParam = jpegWriter.getDefaultWriteParam();
            jpegWriteParam.setCompressionMode(javax.imageio.ImageWriteParam.MODE_EXPLICIT);
            jpegWriteParam.setCompressionQuality(JPEG_QUALITY);
            
            jpegWriter.setOutput(ImageIO.createImageOutputStream(outputStream));
            jpegWriter.write(null, new javax.imageio.IIOImage(resizedImage, null, null), jpegWriteParam);
            jpegWriter.dispose();
            
            byte[] compressedBytes = outputStream.toByteArray();
            log.info("Compression complete: {} bytes → {} bytes ({}% reduction)", 
                originalImageBytes.length, 
                compressedBytes.length,
                100 - (compressedBytes.length * 100 / originalImageBytes.length));
            
            // Check if base64 size is acceptable
            int estimatedBase64Size = (compressedBytes.length * 4 / 3) + 4;
            if (estimatedBase64Size > MAX_BASE64_SIZE) {
                log.warn("Base64 size still too large: {} bytes (limit: {})", estimatedBase64Size, MAX_BASE64_SIZE);
            }
            
            return compressedBytes;
            
        } catch (Exception e) {
            log.error("Error compressing image: {}", e.getMessage());
            log.warn("Falling back to original image bytes");
            return originalImageBytes;
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

